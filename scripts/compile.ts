import {compileContract} from 'ton-compiler'
import path from 'path'
import fs from 'fs'
import {CompilationResult} from 'ton-compiler/dist/types'

const CONTRACTS: string[] = [
    'jetton-minter-discoverable',
    'jetton-wallet'
]

type Version = 'v2022.10' | 'legacy'
type Config = {
    version: Version
    stdlib: boolean
    source: string
    output: string
}

const config: Config = {
    version: 'v2022.10',
    stdlib: true,
    source: './contracts',
    output: './build'
}

async function main(config: Config): Promise<void> {
    if (!fs.existsSync(path.resolve(config.output)))
        fs.mkdirSync(path.resolve(config.output), {recursive: true})
    await compileAll(config, CONTRACTS)
}

async function compileAll(config: Config, contracts: string[]): Promise<void> {
    for (const contract of contracts)
        await compile(config, contract)
}

async function compile(config: Config, contract: string): Promise<void> {
    const compilationResult: CompilationResult = await compileContract({
        files: [path.resolve(`${config.source}/${contract}.fc`)],
        version: config.version,
        stdlib: config.stdlib
    })
    if (compilationResult.ok) {
        const base64: string = `export default '${compilationResult.output.toString('hex')}'`
        fs.writeFileSync(path.resolve(`${config.output}/${contract}.fift`), compilationResult.fift)
        fs.writeFileSync(path.resolve(`${config.output}/${contract}.cell`), compilationResult.output)
        fs.writeFileSync(path.resolve(`${config.output}/${contract}.base64.ts`), base64)
    } else
        console.warn(compilationResult.log)
}

main(config).catch(console.dir)