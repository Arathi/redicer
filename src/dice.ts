import { evaluate } from 'mathjs';

const ROLL_COMMAND_REGEX = /^r(\d+)?d(\d+)?(([+|-]\d+)*)$/;
const ADDITIONS_REGEX = /[+|-]\d+/g;

export function roll({
  amount,
  face,
  additions,
}: RollOptions): RollResult {
  const results: number[] = [];
  for (let i = 0; i < amount; i++) {
    const result = Math.ceil(Math.random() * face);
    results.push(result);
  }

  const additionSum: number = evaluate(additions) ?? 0;
  console.debug(`${additions} = ${additionSum}`);

  const values = [...results];
  const sum = values.reduce((a, b) => a + b, additionSum);
  return {
    face,
    amount,
    additions,
    values,
    sum,
  };
}

export type RollOptions = {
  amount: number,
  face: number,
  additions: string,
};

export type RollResult = {
  amount: number;
  face: number;
  additions?: string;
  values: number[];
  sum: number;
};

export function parseRollOptions(
  command: string,
  defaultFace: number | undefined = undefined,
): RollOptions {
  const matcher = ROLL_COMMAND_REGEX.exec(command);
  if (matcher == null) {
    throw `rd命令格式错误！`;
  }

  const inputAmount = parseInt(matcher[1]);
  const inputFace = parseInt(matcher[2]);
  const additions = matcher[3];

  let amount = 1;
  if (!isNaN(inputAmount)) {
    amount = inputAmount;
  }
  if (amount < 1 || amount > 100) {
    throw `骰子数量过多！`;
  }

  let face = 20;
  if (defaultFace !== undefined) {
    face = defaultFace;
  }
  if (!isNaN(inputFace)) {
    face = inputFace;
  }
  if (face < 4 || face > 100) {
    throw `无效的骰子类型：D${face}`;
  }

  return {
    face,
    amount,
    additions,
  }
}

export function formatRollResult(result: RollResult): string {
  let additions = result.additions ?? '';
  const command = `r${result.amount}d${result.face}${additions}`;
  let values = result.values.join("+");
  return `${command} = ${values}${additions} = ${result.sum}`;
}
