# Testing Fibonacci Code with Debugger

## Simple Fibonacci Test Code

Use this code to test the debugger step functionality:

```c
#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int n = 5;
    int result = fibonacci(n);
    printf("Fibonacci of %d is %d\n", n, result);
    return 0;
}
```

## Testing Steps

1. **Copy the code above** into your IDE (use `examples/fibonacci.c` or create a new file)

2. **Compile** the code (Ctrl+Enter or click Compile button)

3. **Click Debug** button to start debugging

4. **Check the Memory tab** - you should see:
   - Registers showing current values
   - Stack Frames showing the call chain (main → fibonacci → fibonacci → ...)
   - Variables showing function parameters
   - Execution Stats showing cycles and stack usage
   - Memory Map showing stack growth
   - Timeline showing all instructions

5. **Click the Step button** in the Timeline panel to advance through instructions

6. **Watch for changes**:
   - Step counter should increment (e.g., "Step 1 / 50")
   - Registers should update
   - Stack Frames should show recursive calls
   - Memory Map should show stack growing/shrinking
   - Timeline should highlight the current instruction

## Troubleshooting

If the step button doesn't work:

1. **Check browser console** (F12) for debug logs
2. **Verify trace data** - Make sure `debugTrace` has data
3. **Check step counter** - Should show "Step X / Y" format
4. **Button state** - Button should be enabled until the last step, then show "End"

## Expected Behavior

- **Step button** should advance from step 1 to step N
- **All panels** should update with each step
- **Stack frames** should show recursive calls building up
- **Registers** should show parameter values changing
- **Memory map** should show stack growing during recursion
