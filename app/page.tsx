import { redirect } from "next/navigation";
import { hasCredentials } from "@/lib/credentials";

export default async function Home() {
  try {
    const credsExist = await hasCredentials();
    if (credsExist) {
      redirect("/orders");
    } else {
      redirect("/credentials");
    }
  } catch {
    redirect("/credentials");
  }
}
