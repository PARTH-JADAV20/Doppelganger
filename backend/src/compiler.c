#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdbool.h>

// ------------------------------------------------------------------
// Real-Time C Compiler to Custom ISA
// ------------------------------------------------------------------

typedef enum {
    TOK_INT, TOK_IDENTIFIER, TOK_NUMBER, TOK_STRING,
    TOK_IF, TOK_ELSE, TOK_WHILE, TOK_FOR, TOK_RETURN,
    TOK_LPAREN, TOK_RPAREN, TOK_LBRACE, TOK_RBRACE,
    TOK_SEMICOLON, TOK_COMMA,
    TOK_ASSIGN, TOK_PLUS, TOK_MINUS, TOK_STAR, TOK_SLASH,
    TOK_EQ, TOK_NEQ, TOK_LT, TOK_LE, TOK_GT, TOK_GE,
    TOK_PLUSPLUS, TOK_MINUSMINUS,
    TOK_EOF, TOK_UNKNOWN
} TokenType;

typedef struct {
    TokenType type;
    char text[256];
    int line;
} Token;

Token tokens[10000];
int token_count = 0;
int current_token = 0;

void tokenize(const char* source) {
    int i = 0;
    int line = 1;
    while (source[i] != '\0') {
        if (isspace((unsigned char)source[i])) {
            if (source[i] == '\n') line++;
            i++;
            continue;
        }
        
        // Skip comments //
        if (source[i] == '/' && source[i+1] == '/') {
            while (source[i] != '\n' && source[i] != '\0') i++;
            continue;
        }
        
        // Skip preprocessor #
        if (source[i] == '#') {
            while (source[i] != '\n' && source[i] != '\0') i++;
            continue;
        }

        Token t;
        t.line = line;
        
        if (isalpha((unsigned char)source[i]) || source[i] == '_') {
            int j = 0;
            while (isalnum((unsigned char)source[i]) || source[i] == '_') {
                t.text[j++] = source[i++];
            }
            t.text[j] = '\0';
            
            if (strcmp(t.text, "int") == 0) t.type = TOK_INT;
            else if (strcmp(t.text, "if") == 0) t.type = TOK_IF;
            else if (strcmp(t.text, "else") == 0) t.type = TOK_ELSE;
            else if (strcmp(t.text, "while") == 0) t.type = TOK_WHILE;
            else if (strcmp(t.text, "for") == 0) t.type = TOK_FOR;
            else if (strcmp(t.text, "return") == 0) t.type = TOK_RETURN;
            else t.type = TOK_IDENTIFIER;
            
            tokens[token_count++] = t;
            continue;
        }
        
        if (isdigit((unsigned char)source[i])) {
            int j = 0;
            while (isdigit((unsigned char)source[i])) {
                t.text[j++] = source[i++];
            }
            t.text[j] = '\0';
            t.type = TOK_NUMBER;
            tokens[token_count++] = t;
            continue;
        }
        
        if (source[i] == '"') {
            int j = 0;
            i++; // skip quote
            while (source[i] != '"' && source[i] != '\0') {
                if (source[i] == '\\' && source[i+1] == 'n') {
                    t.text[j++] = '\\'; t.text[j++] = 'n'; i+=2;
                } else {
                    t.text[j++] = source[i++];
                }
            }
            if (source[i] == '"') i++;
            t.text[j] = '\0';
            t.type = TOK_STRING;
            tokens[token_count++] = t;
            continue;
        }
        
        t.text[0] = source[i];
        t.text[1] = '\0';
        
        if (source[i] == '=' && source[i+1] == '=') { strcpy(t.text, "=="); t.type = TOK_EQ; i += 2; }
        else if (source[i] == '!' && source[i+1] == '=') { strcpy(t.text, "!="); t.type = TOK_NEQ; i += 2; }
        else if (source[i] == '<' && source[i+1] == '=') { strcpy(t.text, "<="); t.type = TOK_LE; i += 2; }
        else if (source[i] == '>' && source[i+1] == '=') { strcpy(t.text, ">="); t.type = TOK_GE; i += 2; }
        else if (source[i] == '+' && source[i+1] == '+') { strcpy(t.text, "++"); t.type = TOK_PLUSPLUS; i += 2; }
        else if (source[i] == '-' && source[i+1] == '-') { strcpy(t.text, "--"); t.type = TOK_MINUSMINUS; i += 2; }
        else if (source[i] == '(') { t.type = TOK_LPAREN; i++; }
        else if (source[i] == ')') { t.type = TOK_RPAREN; i++; }
        else if (source[i] == '{') { t.type = TOK_LBRACE; i++; }
        else if (source[i] == '}') { t.type = TOK_RBRACE; i++; }
        else if (source[i] == ';') { t.type = TOK_SEMICOLON; i++; }
        else if (source[i] == ',') { t.type = TOK_COMMA; i++; }
        else if (source[i] == '=') { t.type = TOK_ASSIGN; i++; }
        else if (source[i] == '+') { t.type = TOK_PLUS; i++; }
        else if (source[i] == '-') { t.type = TOK_MINUS; i++; }
        else if (source[i] == '*') { t.type = TOK_STAR; i++; }
        else if (source[i] == '/') { t.type = TOK_SLASH; i++; }
        else if (source[i] == '<') { t.type = TOK_LT; i++; }
        else if (source[i] == '>') { t.type = TOK_GT; i++; }
        else { t.type = TOK_UNKNOWN; i++; }
        
        tokens[token_count++] = t;
    }
    
    Token eof;
    eof.type = TOK_EOF;
    strcpy(eof.text, "EOF");
    eof.line = line;
    tokens[token_count++] = eof;
}

FILE* out;
int label_counter = 0;
char current_function[64] = "";

int next_label() { return label_counter++; }

Token peek() { return tokens[current_token]; }
Token consume() { return tokens[current_token++]; }
void match(TokenType t) {
    if (peek().type == t) consume();
    else { fprintf(stderr, "Syntax error at line %d: expected type %d got type %d ('%s')\n", peek().line, t, peek().type, peek().text); exit(1); }
}

typedef struct {
    char name[64];
    int offset;
} Var;

Var vars[100];
int var_count = 0;
int current_offset = 0;

int get_var_offset(const char* name) {
    for (int i=var_count-1; i>=0; i--) {
        if (strcmp(vars[i].name, name) == 0) return vars[i].offset;
    }
    fprintf(stderr, "Undefined var: %s\n", name);
    exit(1);
}

void parse_expression();
void parse_statement();

void parse_primary() {
    Token t = consume();
    if (t.type == TOK_NUMBER) {
        fprintf(out, "LOAD R0, %s\n", t.text);
    } else if (t.type == TOK_IDENTIFIER) {
        if (peek().type == TOK_LPAREN) {
            // Function call
            char func_name[256];
            strcpy(func_name, t.text);
            consume(); // (
            int args = 0;
            if (strcmp(func_name, "printf") == 0) {
                if (peek().type != TOK_RPAREN) {
                    if (peek().type == TOK_STRING) {
                        Token fmt = consume();
                        char* p = strstr(fmt.text, "%d");
                        if (p) {
                            // Simple format string support: split at first %d
                            char prefix[256];
                            int len = p - fmt.text;
                            strncpy(prefix, fmt.text, len);
                            prefix[len] = '\0';
                            if (len > 0) fprintf(out, "PRINT_STR \"%s\"\n", prefix);
                            
                            if (peek().type == TOK_COMMA) consume();
                            parse_expression();
                            fprintf(out, "PRINT_INT R0\n");
                            
                            if (p[2] != '\0') fprintf(out, "PRINT_STR \"%s\"\n", p + 2);
                        } else {
                            fprintf(out, "PRINT_STR \"%s\"\n", fmt.text);
                        }
                    } else {
                        parse_expression();
                        fprintf(out, "PRINT_INT R0\n");
                    }
                    while (peek().type == TOK_COMMA) {
                        consume();
                        parse_expression();
                        fprintf(out, "PRINT_INT R0\n");
                    }
                }
            } else {
                // Normal function call
                if (peek().type != TOK_RPAREN) {
                    while (1) {
                        parse_expression();
                        fprintf(out, "PUSH R0\n");
                        args++;
                        if (peek().type == TOK_COMMA) consume();
                        else break;
                    }
                }
                fprintf(out, "CALL %s\n", func_name);
                if (args > 0) fprintf(out, "ADD SP, SP, %d\n", args);
            }
            consume(); // )
        } else {
            // Variable
            int off = get_var_offset(t.text);
            fprintf(out, "LOAD_LOCAL R0, %d\n", off);
        }
    } else if (t.type == TOK_LPAREN) {
        parse_expression();
        match(TOK_RPAREN);
    } else if (t.type == TOK_STRING) {
        fprintf(out, "PRINT_STR \"%s\"\n", t.text);
    }
}

void parse_term() {
    parse_primary();
    while (peek().type == TOK_STAR || peek().type == TOK_SLASH) {
        Token op = consume();
        fprintf(out, "PUSH R0\n");
        parse_primary();
        fprintf(out, "POP R1\n");
        // R1 op R0 -> R0
        if (op.type == TOK_STAR) fprintf(out, "MUL R0, R1, R0\n");
        else fprintf(out, "DIV R0, R1, R0\n");
    }
}

void parse_additive() {
    parse_term();
    while (peek().type == TOK_PLUS || peek().type == TOK_MINUS) {
        Token op = consume();
        fprintf(out, "PUSH R0\n");
        parse_term();
        fprintf(out, "POP R1\n");
        if (op.type == TOK_PLUS) fprintf(out, "ADD R0, R1, R0\n");
        else fprintf(out, "SUB R0, R1, R0\n");
    }
}

void parse_relational() {
    parse_additive();
    while (peek().type == TOK_LT || peek().type == TOK_GT || peek().type == TOK_LE || peek().type == TOK_GE || peek().type == TOK_EQ || peek().type == TOK_NEQ) {
        Token op = consume();
        fprintf(out, "PUSH R0\n");
        parse_additive();
        fprintf(out, "POP R1\n");
        fprintf(out, "CMP R1, R0\n");
        
        int L_true = next_label();
        int L_end = next_label();
        
        if (op.type == TOK_LT) fprintf(out, "JLT L%d\n", L_true);
        else if (op.type == TOK_GT) fprintf(out, "JGT L%d\n", L_true);
        else if (op.type == TOK_LE) fprintf(out, "JLE L%d\n", L_true);
        else if (op.type == TOK_GE) fprintf(out, "JGE L%d\n", L_true);
        else if (op.type == TOK_EQ) fprintf(out, "JEQ L%d\n", L_true);
        else if (op.type == TOK_NEQ) fprintf(out, "JNE L%d\n", L_true);
        
        fprintf(out, "LOAD R0, 0\n");
        fprintf(out, "JMP L%d\n", L_end);
        fprintf(out, "L%d:\n", L_true);
        fprintf(out, "LOAD R0, 1\n");
        fprintf(out, "L%d:\n", L_end);
    }
}

void parse_expression() {
    // If identifier followed by =, it's assignment
    if (peek().type == TOK_IDENTIFIER && tokens[current_token+1].type == TOK_ASSIGN) {
        Token id = consume();
        consume(); // =
        parse_expression();
        int off = get_var_offset(id.text);
        fprintf(out, "STORE_LOCAL %d, R0\n", off);
        return;
    }
    parse_relational();
}

void parse_statement() {
    if (peek().type == TOK_INT) {
        consume();
        Token id = consume();
        strcpy(vars[var_count].name, id.text);
        current_offset++; // local vars are negative offsets in stack frame
        vars[var_count].offset = -current_offset;
        fprintf(out, "; VAR %s %d\n", vars[var_count].name, vars[var_count].offset);
        var_count++;
        
        if (peek().type == TOK_ASSIGN) {
            consume();
            parse_expression();
            fprintf(out, "STORE_LOCAL %d, R0\n", -current_offset);
        }
        match(TOK_SEMICOLON);
    } else if (peek().type == TOK_RETURN) {
        consume();
        parse_expression();
        if (strcmp(current_function, "main") == 0) {
            fprintf(out, "HALT\n");
        } else {
            fprintf(out, "RET\n");
        }
        match(TOK_SEMICOLON);
    } else if (peek().type == TOK_IF) {
        consume();
        match(TOK_LPAREN);
        parse_expression();
        match(TOK_RPAREN);
        
        int L_false = next_label();
        int L_end = next_label();
        
        fprintf(out, "CMP R0, 0\n");
        fprintf(out, "JEQ L%d\n", L_false);
        
        if (peek().type == TOK_LBRACE) {
            consume();
            while(peek().type != TOK_RBRACE) parse_statement();
            consume();
        } else {
            parse_statement();
        }
        
        fprintf(out, "JMP L%d\n", L_end);
        fprintf(out, "L%d:\n", L_false);
        
        if (peek().type == TOK_ELSE) {
            consume();
            if (peek().type == TOK_LBRACE) {
                consume();
                while(peek().type != TOK_RBRACE) parse_statement();
                consume();
            } else {
                parse_statement();
            }
        }
        fprintf(out, "L%d:\n", L_end);
    } else if (peek().type == TOK_WHILE) {
        int L_start = next_label();
        int L_end = next_label();
        
        fprintf(out, "L%d:\n", L_start);
        consume();
        match(TOK_LPAREN);
        parse_expression();
        match(TOK_RPAREN);
        
        fprintf(out, "CMP R0, 0\n");
        fprintf(out, "JEQ L%d\n", L_end);
        
        if (peek().type == TOK_LBRACE) {
            consume();
            while(peek().type != TOK_RBRACE) parse_statement();
            consume();
        } else {
            parse_statement();
        }
        
        fprintf(out, "JMP L%d\n", L_start);
        fprintf(out, "L%d:\n", L_end);
    } else if (peek().type == TOK_FOR) {
        consume();
        match(TOK_LPAREN);
        
        // Init block
        if (peek().type == TOK_INT) {
            consume();
            Token id = consume();
            strcpy(vars[var_count].name, id.text);
            current_offset++;
            vars[var_count].offset = -current_offset;
            fprintf(out, "; VAR %s %d\n", vars[var_count].name, vars[var_count].offset);
            var_count++;
            match(TOK_ASSIGN);
            parse_expression();
            fprintf(out, "STORE_LOCAL %d, R0\n", -current_offset);
        } else if (peek().type != TOK_SEMICOLON) {
            parse_expression();
        }
        match(TOK_SEMICOLON);
        
        int L_start = next_label();
        int L_end = next_label();
        int L_body = next_label();
        int L_incr = next_label();
        
        fprintf(out, "L%d:\n", L_start);
        if (peek().type != TOK_SEMICOLON) {
            parse_expression();
            fprintf(out, "CMP R0, 0\n");
            fprintf(out, "JEQ L%d\n", L_end);
        }
        match(TOK_SEMICOLON);
        
        fprintf(out, "JMP L%d\n", L_body);
        fprintf(out, "L%d:\n", L_incr);
        
        if (peek().type != TOK_RPAREN) {
            if (peek().type == TOK_IDENTIFIER && tokens[current_token+1].type == TOK_PLUSPLUS) {
                Token id = consume(); consume();
                int off = get_var_offset(id.text);
                fprintf(out, "LOAD_LOCAL R0, %d\n", off);
                fprintf(out, "ADD R0, R0, 1\n");
                fprintf(out, "STORE_LOCAL %d, R0\n", off);
            } else {
                parse_expression();
            }
        }
        match(TOK_RPAREN);
        fprintf(out, "JMP L%d\n", L_start);
        
        fprintf(out, "L%d:\n", L_body);
        if (peek().type == TOK_LBRACE) {
            consume();
            while(peek().type != TOK_RBRACE) parse_statement();
            consume();
        } else {
            parse_statement();
        }
        
        fprintf(out, "JMP L%d\n", L_incr);
        fprintf(out, "L%d:\n", L_end);
    } else if (peek().type == TOK_LBRACE) {
        consume();
        while (peek().type != TOK_RBRACE && peek().type != TOK_EOF) {
            parse_statement();
        }
        match(TOK_RBRACE);
    } else {
        if (peek().type == TOK_IDENTIFIER && tokens[current_token+1].type == TOK_PLUSPLUS) {
            Token id = consume(); consume(); // skip ++
            int off = get_var_offset(id.text);
            fprintf(out, "LOAD_LOCAL R0, %d\n", off);
            fprintf(out, "ADD R0, R0, 1\n");
            fprintf(out, "STORE_LOCAL %d, R0\n", off);
        } else {
            parse_expression();
        }
        match(TOK_SEMICOLON);
    }
}

void parse_function() {
    match(TOK_INT);
    Token id = consume();
    strcpy(current_function, id.text);
    fprintf(out, "%s:\n", id.text);
    fprintf(out, "; FUNC %s\n", id.text);
    fprintf(out, "SUB SP, SP, 10\n"); // reserve locals
    
    // reset locals scope
    var_count = 0;
    current_offset = 0;
    
    match(TOK_LPAREN);
    if (peek().type != TOK_RPAREN) {
        match(TOK_INT);
        Token arg = consume();
        strcpy(vars[var_count].name, arg.text);
        vars[var_count].offset = 2; // arg is at BP + 2
        fprintf(out, "; VAR %s %d\n", vars[var_count].name, vars[var_count].offset);
        var_count++;
        // NOTE: only handling 1 param for simplicity, enough for fib(n)
    }
    match(TOK_RPAREN);
    
    match(TOK_LBRACE);
    while (peek().type != TOK_RBRACE && peek().type != TOK_EOF) {
        parse_statement();
    }
    match(TOK_RBRACE);
    
    if (strcmp(id.text, "main") == 0) {
        fprintf(out, "HALT\n");
    } else {
        // Fallback return sequence if no explicit return hit
        fprintf(out, "RET\n");
    }
}

void parse_program() {
    while (peek().type != TOK_EOF) {
        if (peek().type == TOK_INT) {
            parse_function();
        } else {
            consume();
        }
    }
}

void optimize_file(const char* asm_path) {
    FILE* in = fopen(asm_path, "r");
    if (!in) return;
    char lines[1024][128];
    int count = 0;
    while(fgets(lines[count], 128, in)) {
        lines[count][strcspn(lines[count], "\r\n")] = '\0';
        // Trim trailing spaces
        int len = strlen(lines[count]);
        while(len > 0 && isspace((unsigned char)lines[count][len-1])) {
            lines[count][--len] = '\0';
        }
        count++;
    }
    fclose(in);
    
    // Peephole passes
    bool changed = true;
    while(changed) {
        changed = false;
        for(int i=0; i<count-1; i++) {
            if(strlen(lines[i]) > 0 && strcmp(lines[i], "PUSH R0") == 0 && strcmp(lines[i+1], "POP R0") == 0) {
                // redundant push/pop to same reg
                strcpy(lines[i], "");
                strcpy(lines[i+1], "");
                changed = true;
                i++;
            }
        }
        // pack
        int w = 0;
        for(int r=0; r<count; r++) {
            if(strlen(lines[r]) > 0) {
                strcpy(lines[w++], lines[r]);
            }
        }
        count = w;
    }
    
    FILE* out2 = fopen(asm_path, "w");
    for(int i=0; i<count; i++) fprintf(out2, "%s\n", lines[i]);
    fclose(out2);
}

int main(int argc, char** argv) {
    if (argc < 3) {
        printf("Usage: %s <input.c> <output.asm>\n", argv[0]);
        return 1;
    }
    
    FILE* in = fopen(argv[1], "r");
    if (!in) { printf("Could not open %s\n", argv[1]); return 1; }
    fseek(in, 0, SEEK_END);
    long size = ftell(in);
    fseek(in, 0, SEEK_SET);
    char* src = malloc(size + 1);
    fread(src, 1, size, in);
    src[size] = '\0';
    fclose(in);
    
    tokenize(src);
    
    out = fopen(argv[2], "w");
    if (!out) { printf("Could not open %s\n", argv[2]); return 1; }
    fprintf(out, "JMP main\n");
    parse_program();
    fclose(out);
    
    optimize_file(argv[2]);
    
    return 0;
}
