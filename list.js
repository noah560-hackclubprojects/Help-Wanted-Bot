const fs = require("fs");
const AsyncLock = require("async-lock");

let lock = new AsyncLock();

async function get_list() {
    if (fs.existsSync("jobs.json")) {
        return JSON.parse(fs.readFileSync("jobs.json", "utf8"));
    } else {
        fs.writeFileSync("jobs.json", "[]");
        return [];
    }
}

function save_list(list) {
    fs.writeFileSync("jobs.json", JSON.stringify(list));
}

async function list_transaction(fn) {
    lock.acquire("key", async (done) => {
        save_list(await fn(await get_list()));
        done();
    });
}

async function clear_old_jobs_transform(list) {
    for (let i = jobs.length-1; i >= 0; i--) {
        const e = list[i];
        if (Math.floor(Date.now() / 1000) - e.time > 60*60*24*7) {
            list.splice(1, 1);
        }
    }
    return list;
}

async function add_job(name, user, ysws, description) {
    lock.acquire("key", async (done) => {
        const l = await get_list();
        l.push({
            name: name,
            user: user,
            ysws: ysws,
            description: description,
            time: Math.floor(Date.now() / 1000)
        });
        save_list(l);
    });
}

async function clear_old_jobs() {
    await list_transaction(clear_old_jobs_transform);
}

module.exports = {
    get_list,
    clear_old_jobs,
    add_job,
    job_done: async (title, user) => {
        await list_transaction(async list => {
            return list.filter(x => x.title !== title || x.user !== x.user);
        })
    }
};
