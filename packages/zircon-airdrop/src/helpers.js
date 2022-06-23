function buf2hex(b) {
    return '0x' + b.toString('hex')
}

function hex2buf(h) {
    return Buffer.from(h.replace(/^0x/i, ''), 'hex')
}

module.exports = { buf2hex, hex2buf }
