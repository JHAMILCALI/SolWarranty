import { Link } from 'react-router-dom';
export function HomePage() {
  return <div className="hero">
    <span className="eyebrow">Garantías verificables · Solana Devnet</span>
    <h1>Una garantía que puedes comprobar.</h1>
    <p>La tienda registra y activa garantías digitales. El comprador consulta su vigencia y presenta reclamaciones; cada cambio queda sujeto a las reglas del programa.</p>
    <div className="actions"><Link className="button" to="/store">Panel de tienda</Link><Link className="button secondary" to="/my-warranties">Mis garantías</Link></div>
    <p className="muted">Prototipo académico. Una wallet identifica una dirección, no certifica un comercio ni una compra.</p>
  </div>;
}
