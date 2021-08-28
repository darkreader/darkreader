export class PromiseBarrier {
    private resolves: Array<(value?: any) => void> = [];
    private rejects: Array<(reason?: any) => void> = [];
    private wasResolved = false;
    private wasRejected = false;
    private resolution: any;

    async entry(){
        if (this.wasResolved) {
            return Promise.resolve(this.resolution);
        }
        if (this.wasRejected) {
            return Promise.reject(this.resolution);
        }
        return new Promise((resolve, reject) => {
            this.resolves.push(resolve);
            this.rejects.push(reject);
        });
    }

    async resolve(value?: any){
        if (this.wasRejected || this.wasResolved) {
            return;
        }
        this.wasResolved = true;
        this.resolution = value;
        this.resolves.forEach((resolve) => resolve(value));
        this.resolves = null;
        this.rejects = null;
        return new Promise<void>((resolve) => setTimeout(() => resolve()));
    }

    async reject(reason?: any){
        if (this.wasRejected || this.wasResolved) {
            return;
        }
        this.wasRejected = true;
        this.resolution = reason;
        this.rejects.forEach((reject) => reject(reason));
        this.resolves = null;
        this.rejects = null;
        return new Promise<void>((resolve) => setTimeout(() => resolve()));
    }

    isPending(): boolean {
        return !this.wasResolved && !this.wasRejected;
    }

    isFulfilled(): boolean {
        return this.wasResolved;
    }

    isRejected(): boolean {
        return this.wasRejected;
    }
}
