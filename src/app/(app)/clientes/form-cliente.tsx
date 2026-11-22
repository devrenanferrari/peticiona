"use client";

import type { Cliente } from "@prisma/client";
import { useState } from "react";
import { AreaTexto, Botao, Campo, Card, Entrada, Selecao } from "@/components/kit";
import { inputData } from "@/lib/format";
import { salvarCliente } from "./actions";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function FormCliente({ cliente }: { cliente?: Cliente }) {
  const [tipo, setTipo] = useState(cliente?.tipo ?? "PF");
  const c = cliente;

  // Preenche endereço pelo CEP (ViaCEP).
  async function buscarCep(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) return;
      const form = e.target.form!;
      const set = (n: string, v: string) => {
        const el = form.elements.namedItem(n) as HTMLInputElement | null;
        if (el && !el.value) el.value = v;
      };
      set("endereco", j.logradouro);
      set("bairro", j.bairro);
      set("cidade", j.localidade);
      set("uf", j.uf);
    } catch {
      // sem internet: usuário preenche manualmente
    }
  }

  return (
    <form action={salvarCliente} className="space-y-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Card titulo="Identificação">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Tipo">
            <Selecao name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} opcoes={[["PF", "Pessoa física"], ["PJ", "Pessoa jurídica"]]} />
          </Campo>
          <Campo rotulo="Categoria">
            <Selecao name="categoria" defaultValue={c?.categoria ?? "CLIENTE"} opcoes={[["CLIENTE", "Cliente"], ["PARTE_CONTRARIA", "Parte contrária"], ["TESTEMUNHA", "Testemunha"], ["OUTRO", "Outro"]]} />
          </Campo>
          <Campo rotulo={tipo === "PF" ? "Nome completo *" : "Razão social *"} className="md:col-span-2">
            <Entrada name="nome" required defaultValue={c?.nome} />
          </Campo>
          <Campo rotulo={tipo === "PF" ? "CPF" : "CNPJ"}>
            <Entrada name="documento" defaultValue={c?.documento ?? ""} />
          </Campo>
          {tipo === "PF" && (
            <>
              <Campo rotulo="RG">
                <Entrada name="rg" defaultValue={c?.rg ?? ""} />
              </Campo>
              <Campo rotulo="Nascimento">
                <Entrada name="nascimento" type="date" defaultValue={inputData(c?.nascimento)} />
              </Campo>
              <Campo rotulo="Nacionalidade">
                <Entrada name="nacionalidade" defaultValue={c?.nacionalidade ?? "brasileiro(a)"} />
              </Campo>
              <Campo rotulo="Estado civil">
                <Selecao name="estadoCivil" defaultValue={c?.estadoCivil ?? ""} vazio="—" opcoes={["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "em união estável"]} />
              </Campo>
              <Campo rotulo="Profissão">
                <Entrada name="profissao" defaultValue={c?.profissao ?? ""} />
              </Campo>
            </>
          )}
          <Campo rotulo="Origem">
            <Selecao name="origem" defaultValue={c?.origem ?? ""} vazio="—" opcoes={["Indicação", "Google", "Instagram", "Facebook", "Site", "Parceiro", "Outro"]} />
          </Campo>
        </div>
      </Card>

      <Card titulo="Contato e endereço">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="E-mail" className="md:col-span-2">
            <Entrada name="email" type="email" defaultValue={c?.email ?? ""} />
          </Campo>
          <Campo rotulo="Celular / WhatsApp">
            <Entrada name="celular" defaultValue={c?.celular ?? ""} />
          </Campo>
          <Campo rotulo="Telefone">
            <Entrada name="telefone" defaultValue={c?.telefone ?? ""} />
          </Campo>
          <Campo rotulo="CEP" dica="Preenche o endereço automaticamente">
            <Entrada name="cep" defaultValue={c?.cep ?? ""} onBlur={buscarCep} />
          </Campo>
          <Campo rotulo="Logradouro" className="md:col-span-2">
            <Entrada name="endereco" defaultValue={c?.endereco ?? ""} />
          </Campo>
          <Campo rotulo="Número">
            <Entrada name="numero" defaultValue={c?.numero ?? ""} />
          </Campo>
          <Campo rotulo="Complemento">
            <Entrada name="complemento" defaultValue={c?.complemento ?? ""} />
          </Campo>
          <Campo rotulo="Bairro">
            <Entrada name="bairro" defaultValue={c?.bairro ?? ""} />
          </Campo>
          <Campo rotulo="Cidade">
            <Entrada name="cidade" defaultValue={c?.cidade ?? ""} />
          </Campo>
          <Campo rotulo="UF">
            <Selecao name="uf" defaultValue={c?.uf ?? ""} vazio="—" opcoes={UFS} />
          </Campo>
        </div>
      </Card>

      <Card titulo="Observações">
        <AreaTexto name="observacoes" defaultValue={c?.observacoes ?? ""} />
      </Card>

      <div className="flex justify-end">
        <Botao type="submit">{c ? "Salvar alterações" : "Cadastrar contato"}</Botao>
      </div>
    </form>
  );
}
