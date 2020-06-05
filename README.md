# branch-updater

> A GitHub App which ensures that your main development branch is up to date.

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start

# Run test
npm test
```

### Deploy to AWS Lambda

We're using [serverless](https://www.serverless.com/) for the hard work.

```sh
# Install serverless
## via npm
npm install -g serverless

## via Homebrew
brew install serverless

# Install dependencies
npm install

# Configure serverless: You will need AWS credentials in this step
serverless config

# Deploy stack
serverless deploy
```

## Contributing

If you have suggestions for how branch-updater could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2019 Instana, Inc. https://www.instana.com/
