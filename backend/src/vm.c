#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define MAX_INSTR 1024
#define STACK_SIZE 1024

typedef enum {
    OP_LOAD = 0, OP_LOAD_LOCAL, OP_STORE_LOCAL,
    OP_ADD, OP_SUB, OP_MUL, OP_DIV,
    OP_CMP, OP_JMP, OP_JEQ, OP_JNE, OP_JLT, OP_JLE, OP_JGT, OP_JGE,
    OP_PUSH, OP_POP, OP_CALL, OP_RET, OP_HALT,
    OP_PRINT_INT, OP_PRINT_STR, OP_MOV
} Opcode;

typedef struct {
    Opcode op;
    int args[3];
    char label[64];    // for Jump targets
    char str_val[256]; // for PRINT_STR
} Instruction;

Instruction code[MAX_INSTR];
int code_size = 0;

int regs[4] = {0}; // R0=0, R1=1, R2=2, R3=3 (wait, in AST we just use indices 0 and 1 mostly)
int SP = STACK_SIZE; // stack grows downwards
int BP = STACK_SIZE;
int PC = 0;
int stack[STACK_SIZE];

// Flags
bool flag_eq = false, flag_lt = false, flag_gt = false;

typedef struct {
    char name[64];
    int addr;
} Label;
Label labels[200];
int label_count = 0;

typedef struct {
    char name[64];
    int offset;
    int addr; // Address where this var was defined
} VarMeta;
VarMeta var_meta[500];
int var_meta_count = 0;

typedef struct {
    char name[64];
    int addr;
} FuncMeta;
FuncMeta func_meta[100];
int func_meta_count = 0;

int get_reg_idx(const char* reg_name) {
    if (strcmp(reg_name, "R0") == 0) return 100;
    if (strcmp(reg_name, "R1") == 0) return 101;
    if (strcmp(reg_name, "R2") == 0) return 102;
    if (strcmp(reg_name, "R3") == 0) return 103;
    if (strcmp(reg_name, "SP") == 0) return 104;
    if (strcmp(reg_name, "BP") == 0) return 105;
    return -1;
}

void parse_asm(const char* filepath) {
    FILE* in = fopen(filepath, "r");
    if(!in) { printf("Failed to open %s\n", filepath); exit(1); }
    char line[256];
    
    // First pass: label resolution
    int current_addr = 0;
    while(fgets(line, sizeof(line), in)) {
        // Strip out \r and \n entirely
        line[strcspn(line, "\r\n")] = 0;
        if(line[0] == '\0' || line[0] == ';') continue;

        // Skip leading whitespace for label check
        char first_word[256];
        if (sscanf(line, " %s", first_word) == 1) {
            int len = strlen(first_word);
            if (len > 0 && first_word[len-1] == ':') {
                first_word[len-1] = '\0';
                strcpy(labels[label_count].name, first_word);
                labels[label_count].addr = current_addr;
                label_count++;
                continue; // It's a label, don't increment addr
            }
        }
        current_addr++;
    }
    
    // Second pass: instructions
    rewind(in);
    while(fgets(line, sizeof(line), in)) {
        // Strip out \r and \n entirely
        line[strcspn(line, "\r\n")] = 0;
        
        if(line[0] == '\0' || line[0] == ';') continue;
        
        // Check for label correctly: colon must not be inside quotes. Simplest heuristic: 
        // if the first word ends with a colon, it's a label.
        char first_word[64];
        sscanf(line, " %s", first_word);
        if (first_word[strlen(first_word)-1] == ':') continue;
        
        char op_str[64];
        char arg1[64] = {0}, arg2[64] = {0}, arg3[64] = {0};
        
        // Custom simple parser since sscanf fails easily on variable args
        // " LOAD R0, 5" -> op_str=LOAD, arg1=R0, arg2=5
        // " PRINT_STR \"hello world\""
        
        int i=0;
        while(line[i] == ' ' || line[i] == '\t') i++;
        int j=0;
        while(line[i] && line[i] != ' ' && line[i] != '\n') op_str[j++] = line[i++];
        op_str[j] = '\0';
        
        Instruction inst; memset(&inst, 0, sizeof(Instruction));

        char* meta = strstr(line, "; ");
        if (meta) {
            if (strncmp(meta + 2, "FUNC ", 5) == 0) {
                sscanf(meta + 7, "%s", func_meta[func_meta_count].name);
                func_meta[func_meta_count].addr = current_addr;
                func_meta_count++;
            } else if (strncmp(meta + 2, "VAR ", 4) == 0) {
                sscanf(meta + 6, "%s %d", var_meta[var_meta_count].name, &var_meta[var_meta_count].offset);
                var_meta[var_meta_count].addr = current_addr;
                var_meta_count++;
            }
        }
        
        if(strcmp(op_str, "LOAD") == 0) {
            inst.op = OP_LOAD;
            sscanf(&line[i], " %[^,], %d", arg1, &inst.args[1]);
            inst.args[0] = get_reg_idx(arg1);
        } else if(strcmp(op_str, "LOAD_LOCAL") == 0) {
            inst.op = OP_LOAD_LOCAL;
            sscanf(&line[i], " %[^,], %d", arg1, &inst.args[1]);
            inst.args[0] = get_reg_idx(arg1);
        } else if(strcmp(op_str, "STORE_LOCAL") == 0) {
            inst.op = OP_STORE_LOCAL;
            sscanf(&line[i], " %d, %s", &inst.args[0], arg2);
            inst.args[1] = get_reg_idx(arg2);
        } else if(strcmp(op_str, "MOV") == 0) {
            inst.op = OP_MOV;
            sscanf(&line[i], " %[^,], %s", arg1, arg2);
            inst.args[0] = get_reg_idx(arg1);
            inst.args[1] = get_reg_idx(arg2);
        } else if(strcmp(op_str, "ADD") == 0) { inst.op = OP_ADD; sscanf(&line[i], " %[^,], %[^,], %s", arg1, arg2, arg3); inst.args[0] = get_reg_idx(arg1); inst.args[1] = get_reg_idx(arg2); inst.args[2] = get_reg_idx(arg3); 
             if(inst.args[2] == -1) sscanf(arg3, "%d", &inst.args[2]); // could be imm
        } else if(strcmp(op_str, "SUB") == 0) { inst.op = OP_SUB; sscanf(&line[i], " %[^,], %[^,], %s", arg1, arg2, arg3); inst.args[0] = get_reg_idx(arg1); inst.args[1] = get_reg_idx(arg2); inst.args[2] = get_reg_idx(arg3); 
             if(inst.args[2] == -1) sscanf(arg3, "%d", &inst.args[2]);
        } else if(strcmp(op_str, "MUL") == 0) { inst.op = OP_MUL; sscanf(&line[i], " %[^,], %[^,], %s", arg1, arg2, arg3); inst.args[0] = get_reg_idx(arg1); inst.args[1] = get_reg_idx(arg2); inst.args[2] = get_reg_idx(arg3); 
             if(inst.args[2] == -1) sscanf(arg3, "%d", &inst.args[2]);
        } else if(strcmp(op_str, "DIV") == 0) { inst.op = OP_DIV; sscanf(&line[i], " %[^,], %[^,], %s", arg1, arg2, arg3); inst.args[0] = get_reg_idx(arg1); inst.args[1] = get_reg_idx(arg2); inst.args[2] = get_reg_idx(arg3); 
             if(inst.args[2] == -1) sscanf(arg3, "%d", &inst.args[2]);
        } else if(strcmp(op_str, "CMP") == 0) { inst.op = OP_CMP; sscanf(&line[i], " %[^,], %s", arg1, arg2); inst.args[0] = get_reg_idx(arg1); inst.args[1] = get_reg_idx(arg2); 
            if(inst.args[1] == -1) sscanf(arg2, "%d", &inst.args[1]);
        }
        else if(strcmp(op_str, "PUSH") == 0) { inst.op = OP_PUSH; sscanf(&line[i], " %s", arg1); inst.args[0] = get_reg_idx(arg1); }
        else if(strcmp(op_str, "POP") == 0) { inst.op = OP_POP; sscanf(&line[i], " %s", arg1); inst.args[0] = get_reg_idx(arg1); }
        else if(strcmp(op_str, "JMP") == 0) { inst.op = OP_JMP; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JEQ") == 0) { inst.op = OP_JEQ; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JNE") == 0) { inst.op = OP_JNE; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JLT") == 0) { inst.op = OP_JLT; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JLE") == 0) { inst.op = OP_JLE; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JGT") == 0) { inst.op = OP_JGT; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "JGE") == 0) { inst.op = OP_JGE; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "CALL") == 0) { inst.op = OP_CALL; sscanf(&line[i], " %s", inst.label); }
        else if(strcmp(op_str, "RET") == 0) { inst.op = OP_RET; }
        else if(strcmp(op_str, "HALT") == 0) { inst.op = OP_HALT; }
        else if(strcmp(op_str, "PRINT_INT") == 0) { inst.op = OP_PRINT_INT; sscanf(&line[i], " %s", arg1); inst.args[0] = get_reg_idx(arg1); }
        else if(strcmp(op_str, "PRINT_STR") == 0) { 
            inst.op = OP_PRINT_STR; 
            char* q1 = strchr(&line[i], '"');
            if (q1) {
                char* q2 = strrchr(q1+1, '"');
                if (q2) {
                    *q2 = '\0';
                    strcpy(inst.str_val, q1+1);
                }
            }
        }
        
        // resolve relative addresses early if possible, but JMP/CALL needs labels
        code[code_size++] = inst;
    }
    fclose(in);
    
    // Resolve labels
    for(int i=0; i<code_size; i++) {
        if(code[i].label[0] != '\0') {
            for(int j=0; j<label_count; j++) {
                if(strcmp(labels[j].name, code[i].label) == 0) {
                    code[i].args[0] = labels[j].addr; // jump target
                    break;
                }
            }
        }
    }
}

int get_reg_val(int idx) {
    if(idx >= 100 && idx <= 103) return regs[idx - 100];
    if(idx == 104) return SP;
    if(idx == 105) return BP;
    return idx; // Immediate value
}

void set_reg_val(int idx, int val) {
    if(idx >= 100 && idx <= 103) regs[idx - 100] = val;
    if(idx == 104) SP = val;
    if(idx == 105) BP = val;
}

const char* op_to_str(Opcode op) {
    switch(op) {
        case OP_LOAD: return "LOAD"; case OP_LOAD_LOCAL: return "LOAD_LOCAL";
        case OP_STORE_LOCAL: return "STORE_LOCAL"; case OP_MOV: return "MOV";
        case OP_ADD: return "ADD"; case OP_SUB: return "SUB"; case OP_MUL: return "MUL"; case OP_DIV: return "DIV";
        case OP_CMP: return "CMP"; case OP_PUSH: return "PUSH"; case OP_POP: return "POP";
        case OP_JMP: return "JMP"; case OP_JEQ: return "JEQ"; case OP_JNE: return "JNE";
        case OP_JLT: return "JLT"; case OP_JLE: return "JLE"; case OP_JGT: return "JGT"; case OP_JGE: return "JGE";
        case OP_CALL: return "CALL"; case OP_RET: return "RET"; case OP_HALT: return "HALT";
        case OP_PRINT_INT: return "PRINT_INT"; case OP_PRINT_STR: return "PRINT_STR";
    }
    return "UNKNOWN";
}

int main(int argc, char** argv) {
    bool debug = false;
    if(argc < 2) { printf("Usage: %s <program.asm> [--debug]\n", argv[0]); return 1; }
    if(argc == 3 && strcmp(argv[2], "--debug") == 0) debug = true;
    
    parse_asm(argv[1]);
    
    if (debug) printf("[\n"); // Start JSON array
    
    int tick = 0;
    while(PC < code_size) {
        Instruction inst = code[PC];
        
        if(debug) {
            char current_func[64] = "unknown";
            // Find current function
            for (int i = func_meta_count - 1; i >= 0; i--) {
                if (PC >= func_meta[i].addr) {
                    strcpy(current_func, func_meta[i].name);
                    break;
                }
            }

            if(tick > 0) printf(",\n");
            printf("  {\"tick\": %d, \"pc\": %d, \"op\": \"%s\", \"sp\": %d, \"sp_max\": %d, \"bp\": %d, \"func\": \"%s\", \"r0\": %d, \"r1\": %d, \"r2\": %d, \"r3\": %d, ", 
                   tick, PC, op_to_str(inst.op), SP, STACK_SIZE, BP, current_func, regs[0], regs[1], regs[2], regs[3]);
            
            // Emit variables for current BP
            printf("\"vars\": [");
            bool first_var = true;
            for (int i = 0; i < var_meta_count; i++) {
                // Heuristic: variables defined before or at current PC might be active
                if (PC >= var_meta[i].addr) {
                    if (!first_var) printf(", ");
                    int val = stack[BP + var_meta[i].offset];
                    printf("{\"name\": \"%s\", \"addr\": \"0x%X\", \"val\": %d, \"offset\": %d}", 
                           var_meta[i].name, BP + var_meta[i].offset, val, var_meta[i].offset);
                    first_var = false;
                }
            }
            printf("]}");
        }
        
        PC++;
        tick++;
        
        switch(inst.op) {
            case OP_LOAD: set_reg_val(inst.args[0], inst.args[1]); break;
            case OP_LOAD_LOCAL: set_reg_val(inst.args[0], stack[BP + inst.args[1]]); break;
            case OP_STORE_LOCAL: stack[BP + inst.args[0]] = get_reg_val(inst.args[1]); break;
            case OP_MOV: set_reg_val(inst.args[0], get_reg_val(inst.args[1])); break;
            
            case OP_ADD: 
                set_reg_val(inst.args[0], get_reg_val(inst.args[1]) + get_reg_val(inst.args[2])); break;
            case OP_SUB: 
                set_reg_val(inst.args[0], get_reg_val(inst.args[1]) - get_reg_val(inst.args[2])); break;
            case OP_MUL: set_reg_val(inst.args[0], get_reg_val(inst.args[1]) * get_reg_val(inst.args[2])); break;
            case OP_DIV: set_reg_val(inst.args[0], get_reg_val(inst.args[1]) / get_reg_val(inst.args[2])); break;
            
            case OP_CMP: {
                int a = get_reg_val(inst.args[0]);
                int b = get_reg_val(inst.args[1]);
                flag_eq = (a == b);
                flag_lt = (a < b);
                flag_gt = (a > b);
                break;
            }
            
            case OP_JMP: PC = inst.args[0]; break;
            case OP_JEQ: if(flag_eq) PC = inst.args[0]; break;
            case OP_JNE: if(!flag_eq) PC = inst.args[0]; break;
            case OP_JLT: if(flag_lt) PC = inst.args[0]; break;
            case OP_JLE: if(flag_lt || flag_eq) PC = inst.args[0]; break;
            case OP_JGT: if(flag_gt) PC = inst.args[0]; break;
            case OP_JGE: if(flag_gt || flag_eq) PC = inst.args[0]; break;
            
            case OP_PUSH:
                SP--; stack[SP] = get_reg_val(inst.args[0]); break;
            case OP_POP:
                set_reg_val(inst.args[0], stack[SP]); SP++; break;
                
            case OP_CALL:
                SP--; stack[SP] = PC; // push return address
                SP--; stack[SP] = BP; // save caller's BP directly for simplicity
                BP = SP;              // new frame
                PC = inst.args[0];
                break;
                
            case OP_RET:
                // SP restores to BP
                SP = BP;
                BP = stack[SP]; SP++; // Restore caller's BP
                PC = stack[SP]; SP++; // Pop return address
                break;
                
            case OP_HALT: goto end;
            
            case OP_PRINT_INT:
                if(!debug) {
                    printf("%d", get_reg_val(inst.args[0]));
                    fflush(stdout);
                }
                break;
            case OP_PRINT_STR: {
                if(!debug) {
                    char output[256];
                    strcpy(output, inst.str_val);
                    // Process explicit \n literals
                    char* ptr;
                    while ((ptr = strstr(output, "\\n")) != NULL) {
                        *ptr = '\n';
                        memmove(ptr+1, ptr+2, strlen(ptr+2)+1);
                    }
                    printf("%s", output);
                    fflush(stdout);
                }
                break;
            }
        }
    }
end:
    if (debug) {
        printf("\n]\n"); // End JSON array
    } else {
        // Print final state for simple "Run" mode stats
        printf("\nFINAL_STATE: {\"sp\": %d, \"sp_max\": %d, \"bp\": %d, \"r0\": %d, \"r1\": %d, \"r2\": %d, \"r3\": %d}\n", 
               SP, STACK_SIZE, BP, regs[0], regs[1], regs[2], regs[3]);
    }
    return 0;
}
