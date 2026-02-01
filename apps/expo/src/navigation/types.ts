import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Verify: { email?: string } | undefined;
};

export type HomeStackParamList = {
  HomeIndex: undefined;
};

export type WishlistStackParamList = {
  WishlistIndex: undefined;
  WishlistNew: undefined;
  WishlistDetail: { jarId: string };
  WishlistEdit: { jarId: string };
};

export type TripsStackParamList = {
  TripsIndex: undefined;
  TripNew: undefined;
  TripDetail: { tripId: string };
  TripEdit: { tripId: string };
  TripSnapshots: { tripId: string };
  TripSnapshotDetail: { tripId: string; version: string };
};

export type MeStackParamList = {
  MeIndex: undefined;
  MeMemories: undefined;
};

export type AppTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  WishlistTab: NavigatorScreenParams<WishlistStackParamList>;
  TripsTab: NavigatorScreenParams<TripsStackParamList>;
  MeTab: NavigatorScreenParams<MeStackParamList>;
};

export type PickLocationParams = {
  draftKey?: string;
  initialLat?: number;
  initialLng?: number;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  AppTabs: NavigatorScreenParams<AppTabsParamList>;
  PickLocation: PickLocationParams;
};

