import requests
import sys
import json
from datetime import datetime

class GitRepoAnalyzerTester:
    def __init__(self, base_url="https://gitrepoguide.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.analysis_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=60):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out after {timeout} seconds")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_analyze_invalid_url(self):
        """Test analyze endpoint with invalid URL"""
        success, response = self.run_test(
            "Analyze Invalid URL",
            "POST",
            "analyze",
            400,
            data={"github_url": "invalid-url"}
        )
        return success

    def test_analyze_nonexistent_repo(self):
        """Test analyze endpoint with non-existent repo"""
        success, response = self.run_test(
            "Analyze Non-existent Repo",
            "POST",
            "analyze",
            400,
            data={"github_url": "https://github.com/nonexistent/nonexistent-repo-12345"}
        )
        return success

    def test_analyze_valid_repo(self):
        """Test analyze endpoint with a valid small repo"""
        # Using a small, well-known repo for faster testing
        test_repo = "https://github.com/octocat/Hello-World"
        
        success, response = self.run_test(
            "Analyze Valid Repo (Hello-World)",
            "POST",
            "analyze",
            200,
            data={"github_url": test_repo},
            timeout=120  # Longer timeout for repo cloning and analysis
        )
        
        if success and response:
            # Validate response structure
            required_fields = ['id', 'github_url', 'repo_name', 'framework', 'entry_points', 'file_structure', 'dependencies']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Store analysis ID for potential future use
            self.analysis_id = response.get('id')
            
            # Validate specific fields
            if response['repo_name'] != 'Hello-World':
                print(f"❌ Incorrect repo name: expected 'Hello-World', got '{response['repo_name']}'")
                return False
            
            if response['github_url'] != test_repo:
                print(f"❌ Incorrect GitHub URL in response")
                return False
            
            print(f"✅ Analysis successful:")
            print(f"   - Repo: {response['repo_name']}")
            print(f"   - Framework: {response['framework']}")
            print(f"   - Entry points: {len(response['entry_points'])}")
            print(f"   - Files analyzed: {len(response['file_structure'])}")
            print(f"   - Dependencies found: {len(response['dependencies'])}")
            print(f"   - AI insights: {'Yes' if response.get('ai_insights') else 'No'}")
            
            return True
        
        return success

    def test_history_endpoint(self):
        """Test the history endpoint"""
        success, response = self.run_test(
            "Analysis History",
            "GET",
            "history",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ History retrieved: {len(response)} analyses found")
            return True
        elif success:
            print(f"❌ History endpoint returned non-list response")
            return False
        
        return success

def main():
    print("🚀 Starting Git Repo Analyzer Backend Tests")
    print("=" * 50)
    
    # Setup
    tester = GitRepoAnalyzerTester()
    
    # Run tests in order
    tests = [
        tester.test_root_endpoint,
        tester.test_analyze_invalid_url,
        tester.test_analyze_nonexistent_repo,
        tester.test_analyze_valid_repo,
        tester.test_history_endpoint,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())