/**
 * This is a stripped down, minimal version of the `p-limit` NPM module
 * made by the legend himself, sindresorhus:
 * https://github.com/sindresorhus/p-limit
 * 
 * I'll be honest, this is here because I'm too stupid to figure out the
 * "[ERR_REQUIRE_ESM]: Must use import to load ES Module" error when I
 * import this normally. -- Gilbert
 */

class FnQueue {
    private queue: AnyAsyncFn[];
    constructor() {
        this.queue = [];
    }
    
    get size() { return this.queue.length };
    
    enqueue(fn: AnyAsyncFn) {
        this.queue.push(fn);
    }
    
    // The O(N) dequeue isn't that bad. If you're scraping hundreds of thousands
    // of webpages at once, you've got bigger problems.
    dequeue() {
        return this.queue.shift();
    }
}

type AnyAsyncFn = () => Promise<void>;
export const limiter = (concurrency: number) => {
	const queue = new FnQueue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()!();
		}
	};

	const run = async (fn: AnyAsyncFn, resolve: () => void) => {
		activeCount++;
        try {
            await fn();
        } catch (err) {
            console.error(err);
        }
        resolve();
		next();
	};

	const enqueue = (fn: AnyAsyncFn, resolve: () => void) => {
		queue.enqueue(run.bind(undefined, fn, resolve));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()!();
			}
		})();
	};

	const generator = (fn: AnyAsyncFn) => new Promise<void>(resolve => {
		enqueue(fn, resolve);
	});

	return generator;
}

export type LimitFunction = ReturnType<typeof limiter>;
