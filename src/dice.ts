const ROLL_COMMAND_REGEX = /^r(\d+)?d(\d+)?([+|-]\d+)?$/;

export function roll({
  face = 20,
  amount = 1,
  addition = 0,
}: RollOptions): RollResult {
  const results: number[] = [];
  for (let i = 0; i < amount; i++) {
    const result = Math.ceil(Math.random() * face);
    results.push(result);
  }

  const sum = results.reduce((a, b) => a + b, addition);
  return {
    face,
    amount,
    addition,
    sum,
    results,
  };
}

export type RollOptions = {
  face?: number, 
  amount?: number, 
  addition?: number,
};

export type RollResult = {
  face: number;
  amount: number;
  addition: number;
  sum: number;
  results: number[];
};

export function parseRollOptions(command: string): RollOptions | null {
  const matcher = ROLL_COMMAND_REGEX.exec(command);
  if (matcher == null) return null;

  const inputAmount = parseInt(matcher[1]);
  const inputFace = parseInt(matcher[2]);
  const inputAddition = parseInt(matcher[3]);
  
  let amount = isNaN(inputAmount) ? undefined : inputAmount;
  let face = isNaN(inputFace) ? undefined : inputFace;
  let addition = isNaN(inputAddition) ? undefined : inputAddition;

  return {
    amount,
    face,
    addition,
  }
}

export function formatRollResult(result: RollResult): string {
  let addition = '';
  if (result.addition > 0) {
    addition = `+${result.addition}`;
  } else if (result.addition < 0) {
    addition = `${result.addition}`;
  }

  const command = `r${result.amount}d${result.face}${addition}`;
  let values = result.results.join("+");
  return `${command} = ${values}${addition} = ${result.sum}`;
}
