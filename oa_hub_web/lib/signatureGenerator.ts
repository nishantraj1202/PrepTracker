// Type inference and function signature generator for coding problems

export interface TestCase {
    input: any[];
    output: any;
}

export interface Signatures {
    cpp: string;
    java: string;
    python: string;
    javascript: string;
}

// Infer the type of a value
function inferType(value: any): string {
    if (value === null || value === undefined) return 'any';

    if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        // Check if it's a 2D array
        if (Array.isArray(value[0])) {
            return inferType(value[0]) + '[]';
        }
        // Check element type
        const elemType = inferType(value[0]);
        return elemType + '[]';
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'int' : 'float';
    }
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'bool';

    return 'any';
}

// Convert internal type to C++ type
function toCppType(type: string): string {
    const mapping: Record<string, string> = {
        'int': 'int',
        'float': 'double',
        'string': 'string',
        'bool': 'bool',
        'any': 'auto',
        'int[]': 'vector<int>',
        'float[]': 'vector<double>',
        'string[]': 'vector<string>',
        'bool[]': 'vector<bool>',
        'any[]': 'vector<auto>',
        'int[][]': 'vector<vector<int>>',
        'float[][]': 'vector<vector<double>>',
        'string[][]': 'vector<vector<string>>',
    };
    return mapping[type] || 'auto';
}

// Convert internal type to Java type
function toJavaType(type: string): string {
    const mapping: Record<string, string> = {
        'int': 'int',
        'float': 'double',
        'string': 'String',
        'bool': 'boolean',
        'any': 'Object',
        'int[]': 'int[]',
        'float[]': 'double[]',
        'string[]': 'String[]',
        'bool[]': 'boolean[]',
        'any[]': 'Object[]',
        'int[][]': 'int[][]',
        'float[][]': 'double[][]',
        'string[][]': 'String[][]',
    };
    return mapping[type] || 'Object';
}

// Convert internal type to Python type hint
function toPythonType(type: string): string {
    const mapping: Record<string, string> = {
        'int': 'int',
        'float': 'float',
        'string': 'str',
        'bool': 'bool',
        'any': 'Any',
        'int[]': 'List[int]',
        'float[]': 'List[float]',
        'string[]': 'List[str]',
        'bool[]': 'List[bool]',
        'any[]': 'List[Any]',
        'int[][]': 'List[List[int]]',
        'float[][]': 'List[List[float]]',
        'string[][]': 'List[List[str]]',
    };
    return mapping[type] || 'Any';
}

// Convert internal type to TypeScript/JavaScript type
function toJsType(type: string): string {
    const mapping: Record<string, string> = {
        'int': 'number',
        'float': 'number',
        'string': 'string',
        'bool': 'boolean',
        'any': 'any',
        'int[]': 'number[]',
        'float[]': 'number[]',
        'string[]': 'string[]',
        'bool[]': 'boolean[]',
        'any[]': 'any[]',
        'int[][]': 'number[][]',
        'float[][]': 'number[][]',
        'string[][]': 'string[][]',
    };
    return mapping[type] || 'any';
}

// Generate parameter name based on type
function generateParamName(type: string, index: number): string {
    const typeNames: Record<string, string> = {
        'int': 'n',
        'float': 'x',
        'string': 's',
        'bool': 'flag',
        'int[]': 'nums',
        'float[]': 'arr',
        'string[]': 'strs',
        'bool[]': 'flags',
        'int[][]': 'matrix',
        'string[][]': 'grid',
    };
    const base = typeNames[type] || 'arg';
    return index === 0 ? base : base + (index + 1);
}

// Main function to generate signatures from test cases
export function generateSignatures(testCases: TestCase[]): Signatures {
    if (!testCases || testCases.length === 0) {
        return getDefaultSignatures();
    }

    const firstCase = testCases[0];
    const inputTypes = firstCase.input.map(arg => inferType(arg));
    const outputType = inferType(firstCase.output);

    // Generate parameter list for each language
    const params = inputTypes.map((type, i) => ({
        name: generateParamName(type, i),
        type
    }));

    return {
        cpp: generateCppTemplate(params, outputType),
        java: generateJavaTemplate(params, outputType),
        python: generatePythonTemplate(params, outputType),
        javascript: generateJsTemplate(params, outputType),
    };
}

function generateCppTemplate(params: { name: string, type: string }[], outputType: string): string {
    const cppReturn = toCppType(outputType);
    const cppParams = params.map(p => `${toCppType(p.type)}& ${p.name}`).join(', ');

    return `class Solution {
public:
    ${cppReturn} solution(${cppParams}) {
        // Write your C++ solution here
        
    }
};`;
}

function generateJavaTemplate(params: { name: string, type: string }[], outputType: string): string {
    const javaReturn = toJavaType(outputType);
    const javaParams = params.map(p => `${toJavaType(p.type)} ${p.name}`).join(', ');

    return `class Solution {
    public ${javaReturn} solution(${javaParams}) {
        // Write your Java solution here
        
    }
}`;
}

function generatePythonTemplate(params: { name: string, type: string }[], outputType: string): string {
    const pyReturn = toPythonType(outputType);
    const pyParams = params.map(p => `${p.name}: ${toPythonType(p.type)}`).join(', ');

    return `class Solution:
    def solution(self, ${pyParams}) -> ${pyReturn}:
        # Write your Python solution here
        pass`;
}

function generateJsTemplate(params: { name: string, type: string }[], outputType: string): string {
    const jsReturn = toJsType(outputType);
    const jsParams = params.map(p => p.name).join(', ');
    const jsParamDocs = params.map(p => ` * @param {${toJsType(p.type)}} ${p.name}`).join('\n');

    return `/**
${jsParamDocs}
 * @return {${jsReturn}}
 */
function solution(${jsParams}) {
    // Write your JavaScript solution here
    
}`;
}

function getDefaultSignatures(): Signatures {
    return {
        cpp: `class Solution {
public:
    // Define your function based on the problem
    int solution() {
        
    }
};`,
        java: `class Solution {
    public int solve() {
        // Write your Java solution here
        
    }
}`,
        python: `class Solution:
    def solve(self):
        # Write your Python solution here
        pass`,
        javascript: `/**
 * @return {any}
 */
function solve() {
    // Write your JavaScript solution here
    
}`
    };
}
