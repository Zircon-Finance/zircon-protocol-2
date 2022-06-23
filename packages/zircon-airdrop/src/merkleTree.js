class MerkleTree {
    constructor(leaves, algorithm) {
        this.leaves = leaves;
        this.algorithm = algorithm;
        this.layers = [];
        this.build(this.leaves);
    }
    hash(x) {
        return this.algorithm(x);
    }
    combine_hash(x, y) {
        if (x && !y){
            return x.toString();

        } else if(!x && y){
            return y.toString();

        }else if(x && y){
            return x < y ? this.algorithm(x, y) : this.algorithm(y, x);

        } else
            throw new Error('Failed to generate hash without any inputs.');
    }
    /**
     * Get the merkle root
     */
    get root() {
        const topLayer = this.layers[this.layers.length - 1];
        if (!topLayer)
            throw new Error('Cannot get root without building a tree.');
        if (topLayer.length !== 1)
            throw new Error('Invalid tree.');
        return topLayer[0];
    }
    /**
     * Build a new merkle tree with given leaves
     * @param leaves
     */
    build(leaves) {
        // delete previous tree
        this.layers.length = 0;
        // build the new tree
        this.layers[0] = leaves.map(this.hash.bind(this));
        for (let layer = 0; this.layers[layer].length > 1; layer += 1) {
            this.layers[layer + 1] = this.layers[layer]
                .map((x, i, array) => {
                    if (i % 2 == 0)
                        return this.combine_hash(x, array[i + 1]);
                    return '';
                })
                .filter(Boolean);
        }
    }
    getNeighbor(index, layer) {
        return layer[index % 2 === 0 ? index + 1 : index - 1];
    }
    generateProof(x) {
        let index = this.layers[0].indexOf(this.hash(x));
        if (index === -1)
            throw new Error(`Failed to generate proof for ${x}`);
        return this.layers.slice(0, this.layers.length - 1).reduce((accumulator, layer) => {
            const neighbor = this.getNeighbor(index, layer);
            index = ~~(index / 2);
            if (!neighbor)
                return [...accumulator];
            return [...accumulator, neighbor];
        }, []);
    }
    verifyProof(proof, target) {
        let computed_hash = this.hash(target);
        for (let i = 0; i < proof.length; i++) {
            if (computed_hash <= proof[i])
                computed_hash = this.combine_hash(computed_hash, proof[i]);
            else
                computed_hash = this.combine_hash(proof[i], computed_hash);
        }
        return computed_hash === this.root;
    }
}
module.exports = {MerkleTree};
