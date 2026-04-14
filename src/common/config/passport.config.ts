export default () => ({
  passport: {
    publicKey: process.env.JWT_PUBLIC_KEY,
    privateKey: process.env.JWT_PRIVATE_KEY,
    signOptions: {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  },
});
