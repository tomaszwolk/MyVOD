import { Spinner } from "./spinner";

export const FullPageSpinner = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  );
};
