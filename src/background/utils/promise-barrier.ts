export class PromiseBarrier {
    private resolves = [];
    private rejects = [];
    private wasResolved = false;
    private wasRejected = false;

    async entry(){
        if (this.wasResolved) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.resolves.push(resolve);
            this.rejects.push(reject);
        });
    }

    resolve(){
        if (this.wasRejected || this.wasResolved) {
            return;
        }
        this.wasResolved = true;
        this.resolves.forEach((resolve) => resolve());
    }

    reject(){
        if (this.wasRejected || this.wasResolved) {
            return;
        }
        this.wasRejected = true;
        this.rejects.forEach((reject) => reject());
    }
}
