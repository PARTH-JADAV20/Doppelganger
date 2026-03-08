/**
 * A basic C code formatter for the VoltC IDE.
 * Handles indentation, spacing, and basic structure normalization.
 */
export function formatCCode(code: string): string {
    if (!code) return "";

    const lines = code.split('\n');
    let formattedCode = "";
    let indentLevel = 0;
    const indentSize = 4;

    for (let line of lines) {
        let trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
            // Keep at most one consecutive empty line
            if (!formattedCode.endsWith('\n\n')) {
                formattedCode += '\n';
            }
            continue;
        }

        const openBraces = (trimmedLine.match(/\{/g) || []).length;
        const closeBraces = (trimmedLine.match(/\}/g) || []).length;
        const closingBracesAtStart = (trimmedLine.match(/^\}+/g) || [""])[0].length;

        // Apply indentation reduction BEFORE the line if it starts with }
        // This makes sure the closing brace itself is aligned with the parent block
        indentLevel = Math.max(0, indentLevel - closingBracesAtStart);

        const indentation = ' '.repeat(indentLevel * indentSize);

        // Basic spacing around operators and after commas
        let processedLine = trimmedLine
            .replace(/\s*([=+\-*/%<>!]=?|[&|^]=?|<<=?|>>=?)\s*/g, ' $1 ') // Operators
            .replace(/,\s*/g, ', ') // Commas
            .replace(/\s*\{\s*/g, ' {') // Opening brace spacing
            .replace(/\s*;\s*/g, ';') // Semicolon spacing (remove before)
            .replace(/;\s*/g, '; ') // Semicolon spacing (add after if not end of line)
            .trim();

        // Fix double spaces that might have been introduced
        processedLine = processedLine.replace(/\s+/g, ' ').trim();

        // Specific fixes for common patterns
        processedLine = processedLine
            .replace(/\(\s+/g, '(')
            .replace(/\s+\)/g, ')')
            .replace(/#\s+include/g, '#include')
            .replace(/#\s+define/g, '#define');

        formattedCode += indentation + processedLine + '\n';

        // Update indentLevel for the NEXT line
        // We add all new open braces, and subtract only the close braces that WEREN'T at the start
        const remainingCloseBraces = closeBraces - closingBracesAtStart;
        indentLevel += openBraces - remainingCloseBraces;

        if (indentLevel < 0) indentLevel = 0;
    }

    return formattedCode.trim();
}
