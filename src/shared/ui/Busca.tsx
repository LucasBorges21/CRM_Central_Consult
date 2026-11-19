/** Formulário de busca simples por querystring (?q=). Funciona sem JavaScript. */
export function Busca({ valor, placeholder, rotulo = "Buscar" }: { valor?: string; placeholder: string; rotulo?: string }) {
  return (
    <form role="search" className="mb-4 flex max-w-xl gap-2">
      <input
        type="search"
        name="q"
        defaultValue={valor}
        placeholder={placeholder}
        aria-label={rotulo}
        className="w-full rounded-[10px] border border-borda bg-white px-3 py-2.5 text-sm focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100"
      />
      <button type="submit" className="rounded-[10px] bg-marca-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-700">
        Buscar
      </button>
    </form>
  );
}
