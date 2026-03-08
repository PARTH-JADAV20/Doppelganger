/**
 * A lightweight, client-side syntax checker for C code.
 * Detects common errors like missing semicolons, unmatched braces, etc.
 */

export interface SyntaxError {
    line: number;
    column: number;
    message: string;
    severity: 'Error' | 'Warning';
}

export function checkCSyntax(code: string): SyntaxError[] {
    const errors: SyntaxError[] = [];
    const lines = code.split('\n');

    // Stack for matching braces/parens
    const stack: { char: string; line: number; col: number }[] = [];

    lines.forEach((line, lineIdx) => {
        const trimmed = line.trim();
        const lineNum = lineIdx + 1;

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
            return;
        }

        // 1. Check for missing semicolons (simplified)
        // Check lines that don't end with { } ; or are part of a preprocessor directive
        if (
            trimmed.length > 0 &&
            !trimmed.endsWith('{') &&
            !trimmed.endsWith('}') &&
            !trimmed.endsWith(';') &&
            !trimmed.endsWith(',') &&
            !trimmed.startsWith('#') &&
            !trimmed.startsWith('//') &&
            !trimmed.includes('/*') &&
            !trimmed.includes('static') && // For multiline declarations like `static int x`
            !trimmed.match(/^(if|for|while|switch|else)\b/)
        ) {
            // Check if it's a multiline statement that might continue
            // This is a very basic heuristic
            errors.push({
                line: lineNum,
                column: line.length + 1,
                message: "Expected ';' at end of statement",
                severity: 'Error'
            });
        }

        // 2. Brace/Paren matching
        for (let colIdx = 0; colIdx < line.length; colIdx++) {
            const char = line[colIdx];
            const colNum = colIdx + 1;

            if (char === '{' || char === '(' || char === '[') {
                stack.push({ char, line: lineNum, col: colNum });
            } else if (char === '}' || char === ')' || char === ']') {
                const last = stack.pop();
                if (!last) {
                    errors.push({
                        line: lineNum,
                        column: colNum,
                        message: `Unexpected closing '${char}'`,
                        severity: 'Error'
                    });
                } else if (
                    (char === '}' && last.char !== '{') ||
                    (char === ')' && last.char !== '(') ||
                    (char === ']' && last.char !== '[')
                ) {
                    errors.push({
                        line: lineNum,
                        column: colNum,
                        message: `Mismatched closing '${char}'. Expected partner for '${last.char}'.`,
                        severity: 'Error'
                    });
                }
            }
        }
    });

    // 3. Catch unmatched opening braces remaining in stack
    while (stack.length > 0) {
        const last = stack.pop()!;
        errors.push({
            line: last.line,
            column: last.col,
            message: `Unmatched opening '${last.char}'`,
            severity: 'Error'
        });
    }

    return errors;
}
