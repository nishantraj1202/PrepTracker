// Test Code Execution - Diagnose Compilation Error
// Run this with: node test_code_execution.js

const { runCode } = require('./judge/runner');

// Test C++ Compilation
const cppCode = `
#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> solution(vector<int> nums, int target) {
        return {0, 1};
    }
};

int main() {
    Solution sol;
    vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    vector<int> result = sol.solution(nums, target);
    
    cout << "Result: [";
    for(int i = 0; i < result.size(); i++) {
        if(i > 0) cout << ",";
        cout << result[i];
    }
    cout << "]" << endl;
    
    return 0;
}
`;

// Test Python
const pythonCode = `
class Solution:
    def solution(self, nums, target):
        return [0, 1]

if __name__ == "__main__":
    sol = Solution()
    result = sol.solution([2, 7, 11, 15], 9)
    print(f"Result: {result}")
`;

// Test Java
const javaCode = `
import java.util.*;

class Solution {
    public int[] solution(int[] nums, int target) {
        return new int[]{0, 1};
    }
}

public class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] result = sol.solution(nums, target);
        
        System.out.print("Result: [");
        for(int i = 0; i < result.length; i++) {
            if(i > 0) System.out.print(",");
            System.out.print(result[i]);
        }
        System.out.println("]");
    }
}
`;

async function testAll() {
    console.log("=== Testing C++ ===");
    try {
        const cppResult = await runCode('cpp', cppCode, '');
        console.log("Status:", cppResult.status);
        console.log("Stdout:", cppResult.stdout);
        console.log("Stderr:", cppResult.stderr);
    } catch (err) {
        console.error("C++ Error:", err.message);
    }

    console.log("\n=== Testing Python ===");
    try {
        const pythonResult = await runCode('python', pythonCode, '');
        console.log("Status:", pythonResult.status);
        console.log("Stdout:", pythonResult.stdout);
        console.log("Stderr:", pythonResult.stderr);
    } catch (err) {
        console.error("Python Error:", err.message);
    }

    console.log("\n=== Testing Java ===");
    try {
        const javaResult = await runCode('java', javaCode, '');
        console.log("Status:", javaResult.status);
        console.log("Stdout:", javaResult.stdout);
        console.log("Stderr:", javaResult.stderr);
    } catch (err) {
        console.error("Java Error:", err.message);
    }
}

testAll().then(() => {
    console.log("\n=== All tests complete ===");
    process.exit(0);
}).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
