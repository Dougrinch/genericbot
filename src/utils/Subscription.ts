export type SubscriptionInitialValues<C> = {
  [K in keyof C as K extends `on${infer A}Change` ? Uncapitalize<A> : never]: C[K] extends (v: infer V) => void
    ? V
    : never
}
