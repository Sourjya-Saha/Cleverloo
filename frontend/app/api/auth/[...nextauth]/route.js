import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_BASE_URL = 'https://cleverloo-backend-1.vercel.app';

const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'user-login',
      name: 'User Login',
      credentials: {
        phone: { label: 'Phone Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'boolean' },
      },
      async authorize(credentials) {
        const res = await fetch(`${API_BASE_URL}/signin/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            phone: credentials.phone,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          return {
            id: data.user.id,
            name: data.user.name,
            phone: data.user.phone,
            role: 'user',
            accessToken: data.token,
            rememberMe: credentials.rememberMe,
          };
        } else {
          throw new Error(data.message || 'User authentication failed');
        }
      },
    }),
    CredentialsProvider({
      id: 'restroom-login',
      name: 'Restroom Login',
      credentials: {
        phone: { label: 'Phone Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'boolean' },
      },
      async authorize(credentials) {
        const res = await fetch(`${API_BASE_URL}/signin/restroom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            phone: credentials.phone,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          return {
            id: data.restroom.id,
            name: data.restroom.name,
            phone: data.restroom.phone,
            type: data.restroom.type,
            role: 'restroom',
            accessToken: data.token,
            restroom_id: data.restroom.id,
            rememberMe: credentials.rememberMe,
          };
        } else {
          throw new Error(data.message || 'Restroom authentication failed');
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial creation at login
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.phone = user.phone;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.exp = Math.floor(Date.now() / 1000) + (
          user.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
        );
        if (user.role === 'restroom') {
          token.restroom_id = user.restroom_id;
          token.type = user.type;
        }
      }
      // **Update token with latest fields after session.update()**
      if (trigger === 'update' && session) {
        token.name = session.name ?? token.name;
        token.phone = session.phone ?? token.phone;
        // Add any other fields as necessary
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.phone = token.phone;
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      if (token.role === 'restroom') {
        session.user.restroom_id = token.restroom_id;
        session.user.type = token.type;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
