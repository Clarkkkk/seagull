import { authRouter } from "./router/auth";
import { mapRouter } from "./router/map";
import { postRouter } from "./router/post";
import { tripRouter } from "./router/trip";
import { wishlistRouter } from "./router/wishlist";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  map: mapRouter,
  post: postRouter,
  trip: tripRouter,
  wishlist: wishlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
