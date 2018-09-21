class Notification {
	constructor(kind, value, error) {
        this.kind = kind;
        this.value = value;
        this.error = error;
    }

    subscribe(subscriber) {
        switch (this.kind) {
            case 'N':
                return subscriber.sendNext(this.value);
            case 'E':
                return subscriber.sendError(this.error);
            case 'C':
                return subscriber.sendComplete();
        }
    }

    static createNext(value) {
        return new Notification('N', value);
    }

    static createError(err) {
        return new Notification('E', undefined, err);
    }

    static createComplete() {
        return new Notification('C');
    }
}

module.exports = Notification