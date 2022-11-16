import {Address, beginCell, beginDict, Cell} from 'ton'
import jettonWalletBase64 from '../build/jetton-wallet.base64'
import {DictBuilder} from 'ton/dist/boc/DictBuilder'
import {Buffer} from 'buffer'
import {sha256, stringCell} from './utils/utils'
import BN from 'bn.js'

const DICTIONARY_KEY_LENGTH: number = 256
const ON_CHAIN_CONTENT_PREFIX: number = 0x0

type MetadataKey =
    'name' |
    'description' |
    'image' |
    'symbol'

type Metadata = {
    [key in MetadataKey]: string
}

type MetadataEncoding = {
    [key in MetadataKey]: BufferEncoding
}


const encodings: MetadataEncoding = {
    name: 'utf-8',
    description: 'utf-8',
    image: 'ascii',
    symbol: 'utf-8'
}

export type InitialDataConfig = {
    owner: Address,
    metadata: Metadata
}

export function initialData(config: InitialDataConfig): Cell {
    const dictionary: DictBuilder = beginDict(DICTIONARY_KEY_LENGTH)
    const metadata: Metadata = config.metadata
    for (let key in metadata) {
        const metadataKey: MetadataKey = key as MetadataKey
        const data: string = metadata[metadataKey]
        const encoding: BufferEncoding = encodings[metadataKey]
        const cell: Cell = stringCell(data, encoding)
        const index: Buffer = sha256(metadataKey)
        dictionary.storeRef(index, cell)
    }

    const dictionaryCell: Cell = beginCell()
        .storeInt(ON_CHAIN_CONTENT_PREFIX, 8)
        .storeDict(dictionary.endDict())
        .endCell()

    const jettonWalletCell: Cell = Cell.fromBoc(jettonWalletBase64)[0]
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.owner)
        .storeRef(dictionaryCell)
        .storeRef(jettonWalletCell)
        .endCell();
}

export type MintConfig = {
    to: Address
    gas: BN
    value: BN
    from?: Address
    response?: Address
    forwardTonAmount?: BN
    forwardPayload?: BN
}

export function mintData(config: MintConfig): Cell {
    enum Operations {
        mint = 21,
        internalTransfer = 0x178d4519
    }

    return beginCell()
        .storeUint(Operations.mint, 32)
        .storeUint(0, 64)
        .storeAddress(config.to)
        .storeCoins(config.gas)
        .storeRef(
            beginCell()
                .storeUint(Operations.internalTransfer, 32)
                .storeUint(0, 64)
                .storeCoins(config.value)
                .storeAddress(config.from ?? null)
                .storeAddress(config.response ?? null)
                .storeCoins(config.forwardTonAmount ?? 0)
                // TODO Понять, что делает строчка ниже
                .storeBit(false) // forward_payload in this slice, not separate cell
                .endCell()
        )
        .endCell();
}