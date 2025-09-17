# project_init_full_stack

1) Create an empty folder, add scripts\init-project.mjs
2) Create a minimal package.json with: { "scripts": { "init": "node ./scripts/init-project.mjs" } }
3) Install dev deps for the init CLI: npm i -D prompts execa concurrently eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
4) Run: npm run init (follow prompts)
5) npm install
6) npm run dev
