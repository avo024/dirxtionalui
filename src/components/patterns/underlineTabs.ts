/**
 * Shared underline-tab styling (queue page style) for shadcn `Tabs`. Any page
 * that wants the stage/list-style underline tabs instead of the default pill
 * tabs should spread these onto its `TabsList` / `TabsTrigger`.
 */
export const underlineTabsListClass =
  "h-auto bg-transparent p-0 gap-6 rounded-none justify-start border-b border-border w-full";

export const underlineTabsTriggerClass =
  "rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2.5 pt-0 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground";
