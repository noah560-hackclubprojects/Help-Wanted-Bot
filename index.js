require("dotenv").config();

const { App } = require("@slack/bolt");
const list = require("./list");
const fs = require("fs");

const my_id = "U0BPA4K8TKQ";
const main_channel_id = "get-help-with-projects";

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

async function get_formatted_list() {
    return (await list.get_list()).map(item => {
        return `\`${item.user}\` needs help with \`${item.name}\` for the YSWS \`${item.ysws}\`: \`${item.description}\``
    });
}

app.command("/help-wanted-bot-ping", async ({ command, ack, respond }) => {
    await ack();
    await respond({
        text: `Hi! I'm :robot_face: Help Wanted Bot :robot_face: , and I am here to connect Hack Clubbers who need help with projects to Hack Clubbers who can help them!`
    });
});

app.command("/help-wanted-bot-list", async ({ command, ack, respond }) => {
    await ack();
    await respond({
        text: "Here are current listed help requests:\n" + (await get_formatted_list()).join("\n")
    });
});

app.command("/help-wanted-bot-search", async ({ command, ack, respond }) => {
    await ack();
    const results = (await get_formatted_list()).filter(x => x.includes(command.text));
    if (results.length > 0) {
        await respond({
            text: `Here are your search results for \`${command.text}\`:\n${results.join("\n")}`
        });
    } else {
        await respond({
            text: `I couldn't find anything! Sorry!`
        });
    }
});

app.command("/help-wanted-bot-done", async ({ command, ack, respond }) => {
    await ack();
    const items_  = (await list.get_list());
    const items = items_.filter(item => (item.user === command.user_name && item.name == command.text));
    if (items.length === 0) {
        await respond({
            text: `Sorry, but I couldn't find anything on the list that you posted with that title!`
        });
    } else if (items.length === 1) {
        await respond({
            text: `Deleting it now!`
        });
        await app.client.chat.postMessage({
            channel: main_channel_id,
            text: `ATTENTION: We have a finished help request! \n\`${command.user_name}\` no longer needs help with \`${items[0].name}\`.`
        });
    } else {
        await respond({
            text: `Something weird happened that shouldn't be possible! Please notify \`noahplaysmario\` so he canhelp me figure it out!`
        });
    }
});

app.command("/help-wanted-bot-post", async ({ command, ack, respond }) => {
    try {
        await ack();
        const args_fullsplit = command.text.trim().split(" ");
        const args = args_fullsplit.slice(0, 2);
        const items_  = (await list.get_list());
        const matches = items_.filter(item => (item.user === command.user_name && item.name == args[0]));
        args.push(args_fullsplit.slice(2).join(" "));
        if (matches.length === 0) {
            list.add_job(args[0], command.user_name, args[1], args[2]);
            await respond({
                text: "Okay, I added your request!"
            });
            await app.client.chat.postMessage({
                channel: main_channel_id,
                text: `\`${command.user_name}\` needs help with \`${args[0]}\` for the YSWS \`${args[1]}\`: \`${args[2]}\``
            });
        } else {
            await respond({
                text: "You already have a help request with that title!"
            });
        }
    } catch (e) {
        await respond({
            text: `Oh no! Something happened!\n${e}`
        });
    }
});

app.command("/help-wanted-bot-say", async ({ command, ack, respond }) => {
    await ack();
    if (command.user_id == my_id) {
        if (command.text.length > 0) {
            await app.client.chat.postMessage({
                channel: command.channel_id,
                text: command.text.replaceAll("\\n", "\n")
            });
        } else {
            await app.client.chat.postMessage({
                channel: command.channel_id,
                text: "Here are current listed help requests:\n" + (await get_formatted_list()).join("\n")
            });
        }
    } else {
        await respond({
            text: `:x: NOT ALLOWED :x: \nSorry Dave, I'm afraid I can't do that.`
        });
    }
});

function date() {
    const d = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} at ${d.getUTCHours()}:00 UTC`
}

setInterval(async () => {
    if (!fs.existsSync("last_advertisement")) fs.writeFileSync("last_advertisement", "");
    if (await fs.readFileSync("last_advertisement", "utf8") != date()) {
        fs.writeFileSync("last_advertisement", date());
        await app.client.chat.postMessage({
            channel: main_channel_id,
            text: "It's " + date() + " and here are the current help requests:\n" + (await get_formatted_list()).join("\n")
        });
    }
}, 10000);

(async () => {
    await app.start();
    console.log("bot is running!");
})();
