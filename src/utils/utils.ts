import {Cell} from 'ton'
import {Buffer} from 'buffer'
import {Sha256} from '@aws-crypto/sha256-js'

const SNAKE_PREFIX: number = 0x0
const STRING_CELL_MAX_BYTES: number = Math.floor((1023 - 8) / 8)

export function stringCell(string: string, encoding: BufferEncoding): Cell {
    const root: Cell = new Cell()
    root.bits.writeUint8(SNAKE_PREFIX)
    let buffer: Buffer = Buffer.from(string, encoding)
    let current: Cell = root

    while (buffer.length > 0) {
        current.bits.writeBuffer(buffer.subarray(0, STRING_CELL_MAX_BYTES))
        buffer = buffer.subarray(STRING_CELL_MAX_BYTES)
        if (buffer.length > 0) {
            const next: Cell = new Cell()
            current.refs.push(next)
            current = next
        }
    }
    return root
}

export function sha256(str: string): Buffer {
    const sha = new Sha256()
    sha.update(str)
    return Buffer.from(sha.digestSync())
}