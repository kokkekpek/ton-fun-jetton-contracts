import {mnemonicNew} from 'ton-crypto'
import fs from 'fs'
import path from 'path'

const WORDS: number = 24
const ENV: string = '.env'
const ENV_EXAMPLE: string = '.env.example'

async function main(): Promise<void> {
    const env: string = path.resolve(ENV)
    const envExample: string = path.resolve(ENV_EXAMPLE)
    if (!fs.existsSync(env))
        await fs.copyFileSync(envExample, env)

    const mnemonic: string[] = await mnemonicNew(WORDS)
    const text: string = mnemonic.join(' ')
    const content: string = fs.readFileSync(env, 'utf8')
    const result: string = content.replace(/MNEMONIC=.*/i, `MNEMONIC="${text}"`)
    fs.writeFileSync(env, result)
}

main().catch(console.dir)