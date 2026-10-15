import { permanentRedirect } from "next/navigation";

// Старый адрес страницы «О нас» — теперь /sobre-nosotros.
export default function Page() {
  permanentRedirect("/sobre-nosotros");
}
