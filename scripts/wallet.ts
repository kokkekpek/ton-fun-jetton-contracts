import {mnemonicToWalletKey, KeyPair} from 'ton-crypto'
import {WalletContract, TonClient} from 'ton'
import {WalletV4Source} from 'ton/dist/contracts/sources/WalletV4Source'
import BN from 'bn.js'
import colors from 'colors'
import * as dotenv from 'dotenv'

dotenv.config()
const mnemonic: string[] = process.env.MNEMONIC ? process.env.MNEMONIC.split(' ') : []
const endpoint: string = process.env.ENDPOINT ?? ''
const apiKey: string | undefined = process.env.API_KEY ?? ''
const deployValue: string = process.env.DEPLOY_VALUE ?? '0'

async function main() {
    const key: KeyPair = await mnemonicToWalletKey(mnemonic)
    const client: TonClient = new TonClient({endpoint, apiKey })
    const wallet: WalletContract = WalletContract.create(client, WalletV4Source.create({ publicKey: key.publicKey, workchain: 0 }))
    const balance: BN = await client.getBalance(wallet.address)
    const balanceText: string = BigInt(balance.toString()).toLocaleString()
    const balanceColoredText: string = balance.gte(new BN(deployValue)) ?
        colors.green(balanceText) :
        colors.red(balanceText)
    console.log(endpoint)
    console.log(wallet.address)
    console.log(`Balance: ${balanceColoredText}`)
}
main().catch(console.dir)