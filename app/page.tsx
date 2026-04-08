import { redirect } from "next/navigation";
import { hasCredentials, detectStorageMode } from "@/lib/credentials";

export default async function Home() {
  try {
    const mode = await detectStorageMode();
    const credsExist = await hasCredentials(mode);
    if (credsExist) {
      redirect("/orders");
    } else {
      redirect("/credentials");
    }
  } catch {
    redirect("/credentials");
  }
}
