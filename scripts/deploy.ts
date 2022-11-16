import {WalletV4Source} from 'ton/dist/contracts/sources/WalletV4Source'
import {
    Address,
    Cell,
    CellMessage,
    CommonMessageInfo,
    contractAddress,
    InternalMessage,
    SendMode,
    StateInit, toNano,
    TonClient,
    WalletContract
} from 'ton'
import {KeyPair, mnemonicToWalletKey} from 'ton-crypto'
import * as dotenv from 'dotenv'
import BN from 'bn.js'
import {initialData, InitialDataConfig} from '../src/JettonMinterDiscoverable'
import jettonWalletBase64 from '../build/jetton-minter-discoverable.base64'
import colors from 'colors'

dotenv.config()
const mnemonic: string[] = process.env.MNEMONIC ? process.env.MNEMONIC.split(' ') : []
const endpoint: string = process.env.ENDPOINT ?? ''
const apiKey: string | undefined = process.env.API_KEY ?? ''
const deployGas: BN = toNano(process.env.JETTON_DEPLOY_GAS ?? 0)
const ownerIsDeployWallet: boolean = process.env.JETTON_OWNER_IS_DEPLOY_WALLET === 'true'

const config: InitialDataConfig = {
    owner: process.env.JETTON_OWNER ?
        Address.parse(process.env.JETTON_OWNER) :
        new Address(0, Buffer.alloc(32)),
    metadata: {
        name: process.env.JETTON_NAME ?? '',
        description: process.env.JETTON_DESCRIPTION ?? '',
        image: process.env.JETTON_IMAGE ?? '',
        symbol: process.env.JETTON_SYMBOL ?? ''
    }
}

async function deploy() {
    const client: TonClient = new TonClient({endpoint, apiKey})
    const key: KeyPair = await mnemonicToWalletKey(mnemonic)
    const wallet: WalletContract = WalletContract.create(client, WalletV4Source.create({
        publicKey: key.publicKey,
        workchain: 0
    }))
    const balance: BN = await client.getBalance(wallet.address)
    if (balance.lt(deployGas)) {
        const balanceText: string = BigInt(balance.toString()).toLocaleString()
        const balanceColoredText: string = balance.gte(deployGas) ?
            colors.green(balanceText) :
            colors.red(balanceText)
        const minDeploy: string = (deployGas.toNumber() / 1e9).toLocaleString()
        console.error(colors.red(`Deposit ton to deploy wallet. Minimum ${minDeploy} tons`))
        console.log(endpoint)
        console.log(wallet.address)
        console.log(`Balance: ${balanceColoredText}`)
        return
    }

    if (ownerIsDeployWallet)
        config.owner = wallet.address

    const data: Cell = initialData(config)
    const code: Cell = Cell.fromBoc(jettonWalletBase64)[0]
    const address: Address = contractAddress({workchain: 0, initialData: data, initialCode: code})
    const seqno: number = await wallet.getSeqNo()
    const transfer: Cell = wallet.createTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        sendMode: SendMode.PAY_GAS_SEPARATLY,
        order: new InternalMessage({
            to: address,
            value: new BN(deployGas),
            bounce: false,
            body: new CommonMessageInfo({
                stateInit: new StateInit({data, code}),
                body: new CellMessage(new Cell())
            })
        })
    })

    await client.sendExternalMessage(wallet, transfer)
    console.log(endpoint)
    console.log(address)
}

deploy().catch(console.dir)