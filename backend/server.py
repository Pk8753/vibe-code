from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
import tempfile
import shutil
import ast
import json
from git import Repo
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class AnalyzeRequest(BaseModel):
    github_url: str

class FileNode(BaseModel):
    id: str
    name: str
    path: str
    type: str
    imports: List[str] = []
    size: int = 0

class RepositoryAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    github_url: str
    repo_name: str
    framework: Optional[str] = None
    entry_points: List[str] = []
    file_structure: List[FileNode] = []
    dependencies: Dict[str, List[str]] = {}
    ai_insights: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def detect_framework(repo_path: Path) -> Optional[str]:
    """Detect the framework used in the repository"""
    frameworks = []
    
    # Check for JavaScript frameworks via package.json
    package_json = repo_path / "package.json"
    if package_json.exists():
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
                deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
                
                # Check for Next.js first (superset of React)
                if 'next' in deps:
                    frameworks.append('Next.js')
                # Check for React
                elif 'react' in deps or 'react-dom' in deps:
                    frameworks.append('React')
                    
                # Check for Vue
                if 'vue' in deps:
                    frameworks.append('Vue')
                    
                # Check for Angular
                if 'angular' in deps or '@angular/core' in deps:
                    frameworks.append('Angular')
                    
                # Check for Svelte
                if 'svelte' in deps:
                    frameworks.append('Svelte')
        except Exception as e:
            pass
    
    # Check for React via src files if not found in package.json
    if not frameworks:
        src_dir = repo_path / "src"
        if src_dir.exists():
            for file in src_dir.rglob('*.js*'):
                try:
                    with open(file, 'r', encoding='utf-8') as f:
                        content = f.read(100)  # Read first 100 chars
                        if 'react' in content.lower() or 'import React' in content:
                            frameworks.append('React')
                            break
                except:
                    pass
    
    # Check for Python frameworks
    requirements_txt = repo_path / "requirements.txt"
    if requirements_txt.exists():
        try:
            with open(requirements_txt, 'r') as f:
                content = f.read().lower()
                if 'django' in content:
                    frameworks.append('Django')
                if 'flask' in content:
                    frameworks.append('Flask')
                if 'fastapi' in content:
                    frameworks.append('FastAPI')
        except:
            pass
    
    # Check for Go
    if (repo_path / "go.mod").exists():
        frameworks.append('Go')
    
    # Check for Java/Spring
    if (repo_path / "pom.xml").exists():
        frameworks.append('Java/Maven')
    if (repo_path / "build.gradle").exists():
        frameworks.append('Java/Gradle')
    
    return ', '.join(frameworks) if frameworks else 'Unknown'

def find_entry_points(repo_path: Path) -> List[str]:
    """Find entry points in the repository"""
    entry_points = []
    
    # Common entry point files
    common_entries = [
        'index.js', 'index.ts', 'index.jsx', 'index.tsx',
        'main.py', 'app.py', 'server.py', 'manage.py',
        'main.go', 'main.java', 'Main.java',
        'index.html', 'App.js', 'App.tsx'
    ]
    
    for entry in common_entries:
        if (repo_path / entry).exists():
            entry_points.append(entry)
    
    # Check package.json scripts
    package_json = repo_path / "package.json"
    if package_json.exists():
        try:
            with open(package_json, 'r') as f:
                data = json.load(f)
                scripts = data.get('scripts', {})
                if 'start' in scripts:
                    entry_points.append(f"npm start: {scripts['start']}")
                if 'dev' in scripts:
                    entry_points.append(f"npm run dev: {scripts['dev']}")
        except:
            pass
    
    # Check for src directory
    src_dir = repo_path / "src"
    if src_dir.exists():
        for entry in common_entries:
            src_entry = src_dir / entry
            if src_entry.exists() and entry not in entry_points:
                entry_points.append(f"src/{entry}")
    
    return entry_points

def parse_imports_python(file_path: Path) -> List[str]:
    """Parse Python file for imports"""
    imports = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        imports.append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        imports.append(node.module)
    except:
        pass
    return imports

def parse_imports_js(file_path: Path) -> List[str]:
    """Parse JavaScript/TypeScript file for imports"""
    imports = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Basic regex-based parsing
            import re
            # Match ES6 imports
            es6_pattern = r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]'
            imports.extend(re.findall(es6_pattern, content))
            # Match require statements
            require_pattern = r'require\([\'"]([^\'"]+)[\'"]\)'
            imports.extend(re.findall(require_pattern, content))
    except:
        pass
    return imports

def analyze_file_structure(repo_path: Path) -> tuple[List[FileNode], Dict[str, List[str]]]:
    """Analyze repository file structure and dependencies"""
    files = []
    dependencies = {}
    
    # File extensions to analyze
    code_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.java'}
    
    for file_path in repo_path.rglob('*'):
        if file_path.is_file():
            # Skip hidden files and directories
            if any(part.startswith('.') for part in file_path.parts):
                continue
            # Skip node_modules, venv, etc.
            if any(skip in file_path.parts for skip in ['node_modules', 'venv', '__pycache__', 'dist', 'build']):
                continue
            
            rel_path = file_path.relative_to(repo_path)
            file_ext = file_path.suffix
            
            imports = []
            if file_ext in code_extensions:
                if file_ext == '.py':
                    imports = parse_imports_python(file_path)
                elif file_ext in {'.js', '.jsx', '.ts', '.tsx'}:
                    imports = parse_imports_js(file_path)
            
            try:
                size = file_path.stat().st_size
            except:
                size = 0
            
            file_node = FileNode(
                id=str(uuid.uuid4()),
                name=file_path.name,
                path=str(rel_path),
                type=file_ext or 'file',
                imports=imports,
                size=size
            )
            files.append(file_node)
            
            if imports:
                dependencies[str(rel_path)] = imports
    
    return files, dependencies

async def get_ai_insights(repo_info: dict) -> str:
    """Get AI-powered insights about the repository"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "AI insights unavailable: API key not configured"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message="You are a code analysis expert. Provide clear, concise insights about code repositories."
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Analyze this repository and provide key insights:

Repository: {repo_info['repo_name']}
Framework: {repo_info['framework']}
Entry Points: {', '.join(repo_info['entry_points'])}
Total Files: {repo_info['file_count']}
Key Dependencies: {', '.join(list(repo_info['dependencies'].keys())[:10])}

Provide:
1. Brief overview of the project structure
2. How to run/execute the project
3. Key architectural patterns identified
4. Suggestions for understanding the codebase

Keep it concise and actionable."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return response
    except Exception as e:
        return f"AI insights unavailable: {str(e)}"

# Routes
@api_router.get("/")
async def root():
    return {"message": "Git Repository Analyzer API"}

@api_router.post("/analyze", response_model=RepositoryAnalysis)
async def analyze_repository(request: AnalyzeRequest):
    """Analyze a GitHub repository"""
    temp_dir = None
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        repo_path = Path(temp_dir)
        
        # Clone repository
        try:
            Repo.clone_from(request.github_url, repo_path, depth=1)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to clone repository: {str(e)}")
        
        # Extract repo name
        repo_name = request.github_url.rstrip('/').split('/')[-1].replace('.git', '')
        
        # Detect framework
        framework = detect_framework(repo_path)
        
        # Find entry points
        entry_points = find_entry_points(repo_path)
        
        # Analyze file structure
        file_structure, dependencies = analyze_file_structure(repo_path)
        
        # Get AI insights
        ai_insights = await get_ai_insights({
            'repo_name': repo_name,
            'framework': framework,
            'entry_points': entry_points,
            'file_count': len(file_structure),
            'dependencies': dependencies
        })
        
        # Create analysis object
        analysis = RepositoryAnalysis(
            github_url=request.github_url,
            repo_name=repo_name,
            framework=framework,
            entry_points=entry_points,
            file_structure=file_structure,
            dependencies=dependencies,
            ai_insights=ai_insights
        )
        
        # Save to database
        doc = analysis.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        doc['file_structure'] = [f.model_dump() for f in file_structure]
        
        await db.repository_analyses.insert_one(doc)
        
        return analysis
        
    finally:
        # Cleanup temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

@api_router.get("/history", response_model=List[RepositoryAnalysis])
async def get_analysis_history():
    """Get analysis history"""
    analyses = await db.repository_analyses.find({}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
    
    for analysis in analyses:
        if isinstance(analysis['timestamp'], str):
            analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
    
    return analyses

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()