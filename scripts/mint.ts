import {
    Address,
    Cell, CellMessage,
    CommonMessageInfo,
    contractAddress,
    InternalMessage,
    SendMode, toNano,
    TonClient,
    WalletContract
} from 'ton'
import {KeyPair, mnemonicToWalletKey} from 'ton-crypto'
import {WalletV4Source} from 'ton/dist/contracts/sources/WalletV4Source'
import BN from 'bn.js'
import colors from 'colors'
import {initialData, InitialDataConfig, MintConfig, mintData} from '../src/JettonMinterDiscoverable'
import jettonWalletBase64 from '../build/jetton-minter-discoverable.base64'
import * as dotenv from 'dotenv'

dotenv.config()
const mnemonic: string[] = process.env.MNEMONIC ? process.env.MNEMONIC.split(' ') : []
const endpoint: string = process.env.ENDPOINT ?? ''
const apiKey: string | undefined = process.env.API_KEY ?? undefined
const mintGas: BN = toNano(process.env.MINT_GAS ?? 0)
const ownerIsDeployWallet: boolean = process.env.JETTON_OWNER_IS_DEPLOY_WALLET === 'true'


// TODO move code duplicates from deploy and mint script
const initialConfig: InitialDataConfig = {
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

const mintConfig: MintConfig = {
    to: process.env.MINT_TO ? Address.parse(process.env.MINT_TO) : new Address(0, Buffer.alloc(32)),
    gas: toNano(process.env.MINT_FROM_MITER_TO_JETTON_WALLET_GAS ?? 0),
    value: new BN(process.env.MINT_VALUE ?? 0)
}

async function mint() {
    const client: TonClient = new TonClient({endpoint, apiKey})
    const key: KeyPair = await mnemonicToWalletKey(mnemonic)
    const wallet: WalletContract = WalletContract.create(client, WalletV4Source.create({
        publicKey: key.publicKey,
        workchain: 0
    }))
    const balance: BN = await client.getBalance(wallet.address)
    if (balance.lt(mintGas)) {
        const balanceText: string = BigInt(balance.toString()).toLocaleString()
        const balanceColoredText: string = balance.gte(mintGas) ?
            colors.green(balanceText) :
            colors.red(balanceText)
        const minDeploy: string = (mintGas.toNumber() / 1e9).toLocaleString()
        console.error(colors.red(`Deposit ton to deploy wallet. Minimum ${minDeploy} tons`))
        console.log(endpoint)
        console.log(wallet.address)
        console.log(`Balance: ${balanceColoredText}`)
        return
    }

    if (ownerIsDeployWallet)
        initialConfig.owner = wallet.address

    const initialCell: Cell = initialData(initialConfig)
    const mintCell: Cell = mintData(mintConfig)
    const code: Cell = Cell.fromBoc(jettonWalletBase64)[0]
    const address: Address = contractAddress({workchain: 0, initialData: initialCell, initialCode: code})
    const seqno: number = await wallet.getSeqNo()
    const transfer: Cell = wallet.createTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        sendMode: SendMode.PAY_GAS_SEPARATLY,
        order: new InternalMessage({
            to: address,
            value: new BN(mintGas),
            bounce: false,
            body: new CommonMessageInfo({body: new CellMessage(mintCell)})
        })
    })

    await client.sendExternalMessage(wallet, transfer)
}

mint().catch(console.dir)