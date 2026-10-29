// 初回だけ実行する。note にログインした状態を .profile/ に保存する。
//
//   npm run login
//
// 開いた Chrome で普通にログインしてから、ターミナルで Enter を押すと閉じる。
import { launchPersistent } from "./lib/browser.js";

const ctx = await launchPersistent();
const page = await ctx.newPage();
await page.goto("https://note.com/login");

console.log("\nブラウザで note にログインしてください。");
console.log("ログインが終わったら、このターミナルで Enter を押してください。\n");
await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));

await ctx.close();
console.log("ログイン状態を .profile/ に保存しました。");
