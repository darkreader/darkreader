// evalMath is a function that's able to evaluates a mathematical expression and return it's ouput.
//
// Internally it uses the Shunting Yard algoritm. First it produces a reverse polish notation(RPN) stack.
// Example: 1 + 2 * 3 -> [1, 2, 3, *, +]
//
// Then it evaluates the RPN stack and returns the output.
export function evalMath(expression: string): number {
    // Stack where operators & numbers are stored in RPN.
    const rpnStack: string[] = [];
    // The working stack where new tokens are pushed.
    const workingStack: string[] = [];

    let lastToken: string;
    // Iterate over the expression.
    for (let i = 0, len = expression.length; i < len; i++) {
        const token = expression[i];

        if (!token || token === ' ') {
            continue;
        }

        if (operators.has(token)) {
            const op = operators.get(token);

            while (workingStack.length) {
                const currentOp = operators.get(workingStack[0]);
                if (!currentOp) {
                    break;
                }

                if (op.lessOrEqualThan(currentOp)) {
                    rpnStack.push(workingStack.shift());
                } else {
                    break;
                }
            }
            workingStack.unshift(token);
        } else if (!lastToken || operators.has(lastToken)) {
            rpnStack.push(token);
        } else {
            rpnStack[rpnStack.length - 1] += token;
        }
        lastToken = token;
    }

    rpnStack.push(...workingStack);

    const stack: number[] = [];
    for (let i = 0, len = rpnStack.length; i < len; i++) {
        const op = operators.get(rpnStack[i]);
        if (op) {
            const args = stack.splice(0, 2);
            stack.push(op.exec(args[1], args[0]));
        } else {
            stack.unshift(parseFloat(rpnStack[i]));
        }
    }

    return stack[0];
}

// Operator class  defines a operator that can be parsed & evaluated by evalMath.
class Operator {
    private precendce: number;
    private execMethod: (left: number, right: number) => number;

    constructor(precedence: number, method: (left: number, right: number) => number) {
        this.precendce = precedence;
        this.execMethod = method;
    }

    public exec(left: number, right: number): number {
        return this.execMethod(left, right);
    }

    public lessOrEqualThan(op: Operator) {
        return this.precendce <= op.precendce;
    }
}

const operators: Map<string, Operator> = new Map([
    ['+', new Operator(1, (left: number, right: number): number => left + right)],
    ['-', new Operator(1, (left: number, right: number): number => left - right)],
    ['*', new Operator(2, (left: number, right: number): number => left * right)],
    ['/', new Operator(2, (left: number, right: number): number => left / right)],
]);
