// Demo stand-in for aws-amplify/utils. AuthContext only calls Hub.listen().
export const Hub = {
  listen(_channel: string, _listener: (data: { payload: { event: string } }) => void) {
    return () => {};
  },
  dispatch() {},
};
