export const reportClientError = (context, error) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
};
