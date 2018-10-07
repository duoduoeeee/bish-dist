# bish

**THIS IS CURRENTLY UNDER DEVELOPMENT**

"I love this website!"

This is an interactive shell for operating bilibili, completely inside your terminal!

This project requires NodeJs. Mine is v8.11.2, but perhaps any version above mine will do. If you have compatibility problems, please fire me an issue.

**This project utilizes the following open source software:**

- [vorpal](https://github.com/dthree/vorpal) (super thanks!!!)
- [prompts.js](https://github.com/terkelg/prompts)
- [chalk](https://github.com/chalk/chalk)
- [request](https://github.com/request/request)
- [openurl](https://github.com/rauschma/openurl)
- [node-rsa](https://github.com/rzcoder/node-rsa)

And I'd like to express my thanks and gratitude to all authors of all dependencies of the above software!

## How to install

Inside the `com` folder, run the following:

```bash
git clone https://github.com/dthree/vorpal --depth=1
git clone https://github.com/terkelg/prompts --depth=1
git clone https://github.com/chalk/chalk --depth=1
git clone https://github.com/request/request --depth=1
git clone https://github.com/rauschma/openurl --depth=1
git clone https://github.com/rzcoder/node-rsa --depth=1
```

And then cd to subfolders, run

```bash
npm install --save
```

respectively.

To get the shell running, run `node app.js`. It shall run regardless of your OS platform. You may set up aliases or shortcuts, but we are not covering this right now.
