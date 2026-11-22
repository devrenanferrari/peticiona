import { notFound } from "next/navigation";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Cabecalho } from "@/components/kit";
import { exigirUsuario } from "@/lib/auth";
import { db } from "@/lib/db";
import { excluirModelo } from "../actions";
import { FormModelo } from "../form-modelo";

export default async function EditarModelo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await exigirUsuario();
  const modelo = await db.modelo.findFirst({ where: { id, escritorioId: u.escritorioId } });
  if (!modelo) notFound();
  return (
    <>
      <Cabecalho
        titulo={modelo.titulo}
        acoes={
          <form action={excluirModelo}>
            <input type="hidden" name="id" value={modelo.id} />
            <BotaoConfirmar mensagem="Excluir este modelo?" variante="fantasma" className="text-destructive">
              Excluir modelo
            </BotaoConfirmar>
          </form>
        }
      />
      <FormModelo modelo={modelo} />
    </>
  );
}
