/**
 * 부품 호환성 검증 엔진.
 *
 * 사업계획서의 "특허출원 호환성 알고리즘 (4-2023-071209-7)"에 해당하는 부분으로,
 * 엑셀 부품단가 시트가 이미 들고 있던 스펙 컬럼을 근거로 판정한다.
 *
 * 판정 근거가 없는 경우(스펙 미기재)는 통과시키지 않고 "확인 필요"로 남긴다.
 * 잘못된 통과보다 사람이 한 번 더 보는 쪽이 안전하기 때문이다.
 */

import type { Part, PartCategory } from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

export type IssueLevel = "error" | "warning";

export interface CompatibilityIssue {
  level: IssueLevel;
  /** 문제와 관련된 슬롯 — UI에서 해당 행을 강조하는 데 쓴다 */
  categories: PartCategory[];
  message: string;
  detail?: string;
}

/** 선택된 부품 맵 (카테고리 → 부품). 비어 있는 슬롯은 없다. */
export type Selection = Partial<Record<PartCategory, Part>>;

function num(part: Part | undefined, key: string): number | null {
  if (!part) return null;
  const v = part.specs?.[key];
  return typeof v === "number" ? v : null;
}

function str(part: Part | undefined, key: string): string | null {
  if (!part) return null;
  const v = part.specs?.[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** 메인보드/케이스 폼팩터의 크기 순서. 큰 케이스는 작은 보드를 수용한다. */
const FORM_FACTOR_RANK: Record<string, number> = {
  "M-ATX": 1,
  "ATX": 2,
  "E-ATX": 3,
};

/**
 * 케이스의 수랭 지원 표기에서 최대 라디에이터 열 수를 뽑는다.
 * 실제 값: "상단3열" | "상단2열" | "상단4열" | "2열수랭" | "수랭불가"
 */
function caseMaxRadiatorRows(caseSpec: string | null): number | null {
  if (!caseSpec) return null;
  if (caseSpec.includes("불가")) return 0;
  const m = caseSpec.match(/(\d)\s*열/);
  return m ? Number(m[1]) : null;
}

/** DDR4 / DDR5 처럼 세대만 뽑아낸다 ("DDR5-5600" 같은 표기도 처리) */
function ddrGeneration(value: string | null): string | null {
  if (!value) return null;
  const m = value.toUpperCase().match(/DDR\s*([345])/);
  return m ? `DDR${m[1]}` : null;
}

/**
 * 부품의 DDR 세대를 판정한다.
 *
 * 엑셀 부품단가 시트는 메모리 50건 중 16건의 규격 칸이 비어 있는데,
 * 그 제품들도 제품명에는 "DDR4"/"DDR5"가 그대로 들어 있다
 * (예: "컴이지 킹덤 DDR4 PC4-25600 CL22 16GB").
 * 스펙 칸이 비었다고 검증을 포기하면 실제로 막을 수 있는 오조합을 놓치므로,
 * 스펙 → 제품명 순으로 본다. 저장된 데이터는 엑셀 원본 그대로 두고
 * 판정 시점에만 보완한다.
 */
function partDdr(part: Part | undefined, specKey: string): string | null {
  if (!part) return null;
  return ddrGeneration(str(part, specKey)) ?? ddrGeneration(part.name);
}

export function checkCompatibility(sel: Selection): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  const { cpu, mainboard, memory, gpu, case: pcCase, cpu_cooler: cooler, psu } = sel;

  // ── 1. CPU ↔ 마더보드 플랫폼 ───────────────────────────────
  if (cpu && mainboard) {
    if (
      cpu.platform !== "common" &&
      mainboard.platform !== "common" &&
      cpu.platform !== mainboard.platform
    ) {
      issues.push({
        level: "error",
        categories: ["cpu", "mainboard"],
        message: "CPU와 마더보드의 플랫폼이 다릅니다",
        detail: `CPU는 ${cpu.platform.toUpperCase()}, 마더보드는 ${mainboard.platform.toUpperCase()} 입니다.`,
      });
    }
  }

  // ── 2. 마더보드 ↔ 메모리 규격 ──────────────────────────────
  if (mainboard && memory) {
    const boardDdr = partDdr(mainboard, "memory_support");
    const memDdr = partDdr(memory, "ddr_type");
    if (boardDdr && memDdr && boardDdr !== memDdr) {
      issues.push({
        level: "error",
        categories: ["mainboard", "memory"],
        message: "마더보드가 지원하지 않는 메모리 규격입니다",
        detail: `마더보드는 ${boardDdr}만 지원하는데 선택한 메모리는 ${memDdr} 입니다. 물리적으로 장착되지 않습니다.`,
      });
    } else if (!boardDdr || !memDdr) {
      issues.push({
        level: "warning",
        categories: ["mainboard", "memory"],
        message: "메모리 규격을 확인할 수 없습니다",
        detail: !boardDdr
          ? "마더보드의 메모리지원 정보가 부품 데이터에 없습니다."
          : "메모리의 DDR 규격 정보가 부품 데이터에 없습니다.",
      });
    }
  }

  // ── 3. CPU ↔ 메모리 규격 ──────────────────────────────────
  if (cpu && memory) {
    // CPU는 제품명에 DDR 표기가 없으므로 스펙만 본다.
    const cpuDdr = ddrGeneration(str(cpu, "memory_support"));
    const memDdr = partDdr(memory, "ddr_type");
    if (cpuDdr && memDdr && cpuDdr !== memDdr) {
      issues.push({
        level: "error",
        categories: ["cpu", "memory"],
        message: "CPU가 지원하지 않는 메모리 규격입니다",
        detail: `${cpu.name}는 ${cpuDdr}를 지원하는데 선택한 메모리는 ${memDdr} 입니다.`,
      });
    }
  }

  // ── 4. 그래픽카드 길이 ↔ 케이스 ────────────────────────────
  if (gpu && pcCase) {
    const len = num(gpu, "length_mm");
    const max = num(pcCase, "gpu_max_mm");
    if (len !== null && max !== null) {
      if (len > max) {
        issues.push({
          level: "error",
          categories: ["gpu", "case"],
          message: "그래픽카드가 케이스에 들어가지 않습니다",
          detail: `그래픽카드 길이 ${len}mm > 케이스 허용 ${max}mm (${len - max}mm 초과)`,
        });
      } else if (max - len < 15) {
        issues.push({
          level: "warning",
          categories: ["gpu", "case"],
          message: "그래픽카드 여유 공간이 거의 없습니다",
          detail: `여유 ${max - len}mm — 전원 케이블 굴곡을 고려하면 장착이 빠듯할 수 있습니다.`,
        });
      }
    } else if (len === null || max === null) {
      issues.push({
        level: "warning",
        categories: ["gpu", "case"],
        message: "그래픽카드 장착 가능 여부를 확인할 수 없습니다",
        detail: len === null
          ? "그래픽카드의 가로길이 정보가 없습니다."
          : "케이스의 GPU 허용 길이 정보가 없습니다.",
      });
    }
  }

  // ── 5. CPU쿨러 ↔ 케이스 (공랭 높이 / 수랭 라디에이터) ──────
  if (cooler && pcCase) {
    const type = str(cooler, "cooler_type");

    if (type === "air") {
      const h = num(cooler, "height_mm");
      const max = num(pcCase, "cooler_max_mm");
      if (h !== null && max !== null) {
        if (h > max) {
          issues.push({
            level: "error",
            categories: ["cpu_cooler", "case"],
            message: "CPU쿨러가 케이스 높이를 초과합니다",
            detail: `쿨러 높이 ${h}mm > 케이스 허용 ${max}mm (${h - max}mm 초과) — 측면 패널이 닫히지 않습니다.`,
          });
        } else if (max - h < 5) {
          issues.push({
            level: "warning",
            categories: ["cpu_cooler", "case"],
            message: "CPU쿨러 높이 여유가 거의 없습니다",
            detail: `여유 ${max - h}mm`,
          });
        }
      } else {
        issues.push({
          level: "warning",
          categories: ["cpu_cooler", "case"],
          message: "CPU쿨러 장착 높이를 확인할 수 없습니다",
        });
      }
    }

    if (type === "liquid") {
      const rows = num(cooler, "radiator_rows");
      const caseRows = caseMaxRadiatorRows(str(pcCase, "liquid_cooling"));
      if (caseRows === 0) {
        issues.push({
          level: "error",
          categories: ["cpu_cooler", "case"],
          message: "이 케이스는 수랭 쿨러를 장착할 수 없습니다",
          detail: `${pcCase.name}는 수랭불가 케이스입니다. 공랭 쿨러를 선택하세요.`,
        });
      } else if (rows !== null && caseRows !== null && rows > caseRows) {
        issues.push({
          level: "error",
          categories: ["cpu_cooler", "case"],
          message: "라디에이터가 케이스에 들어가지 않습니다",
          detail: `${rows}열(${rows * 120}mm) 라디에이터 > 케이스 최대 ${caseRows}열(${caseRows * 120}mm)`,
        });
      } else if (caseRows === null) {
        issues.push({
          level: "warning",
          categories: ["cpu_cooler", "case"],
          message: "케이스의 수랭 지원 정보가 없습니다",
        });
      }
    }
  }

  // ── 6. 마더보드 폼팩터 ↔ 케이스 ────────────────────────────
  if (mainboard && pcCase) {
    const board = str(mainboard, "form_factor");
    const shell = str(pcCase, "form_factor");
    if (board && shell) {
      // BTF(후면 커넥터)는 전용 케이스가 필요한 별도 규격이다.
      if (board === "BTF" && shell !== "BTF") {
        issues.push({
          level: "error",
          categories: ["mainboard", "case"],
          message: "BTF 마더보드는 BTF 전용 케이스가 필요합니다",
          detail: "후면 커넥터 구조라 일반 케이스에는 배선 통로가 없습니다.",
        });
      } else if (board !== "BTF" && shell !== "BTF") {
        const b = FORM_FACTOR_RANK[board];
        const s = FORM_FACTOR_RANK[shell];
        if (b && s && b > s) {
          issues.push({
            level: "error",
            categories: ["mainboard", "case"],
            message: "마더보드가 케이스보다 큽니다",
            detail: `${board} 마더보드는 ${shell} 케이스에 들어가지 않습니다.`,
          });
        }
      }
    }
  }

  // ── 7. 파워 용량 (권고 수준) ───────────────────────────────
  if (psu && gpu) {
    const watt = num(psu, "watt");
    // 부품 데이터에 GPU 소비전력이 없어 정밀 계산은 불가능하다.
    // VRAM 용량을 등급 대용으로 삼아 하한선만 경고한다.
    const vram = num(gpu, "vram_gb");
    if (watt !== null && vram !== null && vram >= 12 && watt < 650) {
      issues.push({
        level: "warning",
        categories: ["psu", "gpu"],
        message: "파워 용량이 부족할 수 있습니다",
        detail: `VRAM ${vram}GB급 그래픽카드에 ${watt}W는 여유가 적습니다. 650W 이상을 권장합니다.`,
      });
    }
  }

  // ── 8. 품절·재고 ──────────────────────────────────────────
  for (const part of Object.values(sel)) {
    if (!part) continue;
    if (part.soldOut) {
      issues.push({
        level: "warning",
        categories: [part.category],
        message: `${CATEGORY_META[part.category].label} — 공급사 품절 상태입니다`,
        detail: part.name,
      });
    } else if (part.stock !== null && part.stock <= 0) {
      issues.push({
        level: "warning",
        categories: [part.category],
        message: `${CATEGORY_META[part.category].label} — 보유 재고가 없습니다`,
        detail: `${part.name} (재고 0)`,
      });
    }
  }

  return issues;
}

/** 견적을 확정해도 되는지 — error가 하나라도 있으면 막는다 */
export function hasBlockingIssue(issues: CompatibilityIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

/**
 * 후보 부품을 지금 구성에 넣었을 때 조립이 불가능해지는지 판정한다.
 *
 * 대표 요청(2026-08-24): "호환성 검증을 아예 선택 자체가 안 되게 해버리는 게 낫다."
 * 고른 뒤 경고를 띄우는 대신, 고를 수 없게 만들기 위한 함수다.
 *
 * 규칙을 따로 쓰지 않고 checkCompatibility를 그대로 돌린다. 판정 로직이 두 벌이
 * 되면 picker에서는 통과한 조합이 확정 단계에서 막히는 일이 생기기 때문이다.
 * 후보와 무관한 기존 오류(예: 이미 어긋나 있는 다른 두 슬롯)는 제외하고,
 * 후보가 낀 error만 차단 사유로 본다. warning은 막지 않는다 — 품절·정보 없음은
 * 조립 불가가 아니라 확인 사항이다.
 */
export function blockingReasonFor(
  sel: Selection,
  candidate: Part
): string | null {
  const next: Selection = { ...sel, [candidate.category]: candidate };
  // 후보가 낀 error만 본다 — 다른 두 슬롯끼리 이미 어긋나 있던 건 후보 탓이 아니다.
  const caused = checkCompatibility(next).find(
    (i) => i.level === "error" && i.categories.includes(candidate.category)
  );
  return caused ? caused.message : null;
}
