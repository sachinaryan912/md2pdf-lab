// Type declaration shim for inquirer v9+ (ESM package used in CJS context)
// The package ships its own types but needs this shim when moduleResolution is "node"
declare module 'inquirer' {
  interface QuestionMap {
    input: import('inquirer/dist/cjs/prompts/input.js').InputPrompt;
    editor: import('inquirer/dist/cjs/prompts/editor.js').EditorPrompt;
    select: import('inquirer/dist/cjs/prompts/select.js').SelectPrompt;
    confirm: import('inquirer/dist/cjs/prompts/confirm.js').ConfirmPrompt;
    checkbox: import('inquirer/dist/cjs/prompts/checkbox.js').CheckboxPrompt;
    password: import('inquirer/dist/cjs/prompts/password.js').PasswordPrompt;
    number: import('inquirer/dist/cjs/prompts/number.js').NumberPrompt;
    rawlist: import('inquirer/dist/cjs/prompts/rawlist.js').RawlistPrompt;
    expand: import('inquirer/dist/cjs/prompts/expand.js').ExpandPrompt;
  }

  interface Answers {
    [key: string]: unknown;
  }

  interface Question<T extends Answers = Answers> {
    type?: keyof QuestionMap;
    name: Extract<keyof T, string>;
    message?: string | (() => string);
    default?: unknown;
    choices?: unknown[];
    validate?: (input: unknown) => boolean | string | Promise<boolean | string>;
    filter?: (input: unknown) => unknown;
    when?: boolean | ((answers: T) => boolean);
    pageSize?: number;
    waitUserInput?: boolean;
    prefix?: string;
    suffix?: string;
  }

  function prompt<T extends Answers = Answers>(
    questions: Question<T>[],
    initialAnswers?: Partial<T>
  ): Promise<T> & { ui: unknown };

  export = { prompt };
}
