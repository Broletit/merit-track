
from pathlib import Path
import re, math, textwrap, zipfile, importlib.util

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse, Circle, Polygon, FancyArrowPatch

from docx import Document
from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path("thesis/generated_chapter3")
IMG = ROOT / "diagrams"
XMI = ROOT / "visual-paradigm"
ROOT.mkdir(parents=True, exist_ok=True)
IMG.mkdir(parents=True, exist_ok=True)
XMI.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location("ucdata", "thesis/usecases_data.py")
ucdata = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ucdata)
USECASES = ucdata.USECASES
ACTORS = ucdata.ACTORS
ROLE_MATRIX = ucdata.ROLE_MATRIX
BUSINESS_RULES = ucdata.BUSINESS_RULES
DB_TABLES = ucdata.DB_TABLES

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def clean_actor(text):
    t = (text or "").strip()
    for p in ["Người dùng ", "Sinh viên ", "Cán bộ lớp ", "Cán bộ khoa ", "Quản trị viên ", "Admin "]:
        if t.lower().startswith(p.lower()):
            t = t[len(p):]
            break
    return t[:1].upper() + t[1:] if t else t

def clean_system(text):
    t = (text or "").strip()
    for p in ["Hệ thống ", "System "]:
        if t.lower().startswith(p.lower()):
            t = t[len(p):]
            break
    return t[:1].upper() + t[1:] if t else t

def flatten_main(u):
    steps = []
    n = 1
    for actor, system in u["main"]:
        if actor and actor.strip():
            steps.append((n, "Actor", clean_actor(actor)))
            n += 1
        if system and system.strip():
            steps.append((n, "Hệ thống", clean_system(system)))
            n += 1
    return steps

def branch_base(main_steps):
    # Prefer a system validation/decision step because this is where most alternate/exception branches originate.
    candidates = []
    for n, side, action in main_steps:
        if side == "Hệ thống":
            low = action.lower()
            if any(k in low for k in ["kiểm tra", "xác thực", "đối chiếu", "tính ", "lọc ", "tìm ", "truy vấn", "đọc "]):
                candidates.append(n)
    if candidates:
        return candidates[0]
    return 2 if len(main_steps) >= 2 else 1

ACTOR_VERBS = (
    "chọn","nhập","xác nhận","mở","nộp","đăng ký","hủy","sửa","tải","giữ","đóng",
    "tiếp tục","thực hiện","quét","nhấn","chuyển","xem","yêu cầu","bổ sung"
)
def side_for_branch(text):
    low = text.strip().lower()
    return "Actor" if low.startswith(ACTOR_VERBS) else "Hệ thống"

def branch_actions(items, main_steps, kind):
    if not items or items == ["Không có."]:
        return []
    base = branch_base(main_steps)
    rows = []
    sub = 1
    for raw in items:
        raw = str(raw).strip()
        if not raw or raw.lower() == "không có.":
            continue
        side = side_for_branch(raw)
        txt = clean_actor(raw) if side == "Actor" else clean_system(raw)
        # Rewrite descriptive conditions into action-oriented language for the System column.
        if side == "Hệ thống" and not re.match(r"^(Kiểm tra|Hiển thị|Từ chối|Cho phép|Giữ|Áp dụng|Chuyển|Cập nhật|Ghi|Trả|Kết thúc|Phát hiện|Xác định|Yêu cầu|Thông báo|Không|Đưa|Khôi phục|Chỉ|Sử dụng|Thực hiện)", txt):
            txt = "Xử lý trường hợp: " + txt[:1].lower() + txt[1:]
        rows.append((f"{base}.{sub}", side, txt))
        sub += 1

    if rows:
        joined = " ".join(str(x) for x in items).lower()
        recoverable = any(k in joined for k in ["sai", "thiếu", "không hợp lệ", "trùng", "vượt", "nhập lại", "quay lại", "chọn lại"])
        if kind == "alternative" or recoverable:
            back = max(1, base - 1)
            rows.append((f"{base}.{sub}", "Actor", f"Chọn quay lại bước {back} để điều chỉnh hoặc thực hiện lựa chọn khác."))
        else:
            rows.append((f"{base}.{sub}", "Hệ thống", "Kết thúc use case và không thực hiện thay đổi dữ liệu ngoài các ghi nhận lỗi/audit cần thiết."))
    return rows

def uc_role(u):
    a = u["actor"]
    roles = []
    if "Sinh viên" in a: roles.append("Sinh viên")
    if "Cán bộ lớp" in a: roles.append("Cán bộ lớp")
    if "Cán bộ khoa" in a: roles.append("Cán bộ khoa")
    if "Quản trị viên" in a: roles.append("Quản trị viên")
    if a == "Người dùng":
        roles.extend(["Sinh viên","Cán bộ lớp","Cán bộ khoa","Quản trị viên"])
    return roles

# ------------------------------------------------------------
# Diagrams
# ------------------------------------------------------------
def savefig(path):
    plt.savefig(path, dpi=180, bbox_inches="tight")
    plt.close()

def draw_actor(ax, x, y, label):
    ax.add_patch(Circle((x, y+0.52), 0.16, fill=False, linewidth=1.1))
    ax.plot([x,x],[y+0.36,y-0.12],lw=1.1)
    ax.plot([x-0.25,x+0.25],[y+0.16,y+0.16],lw=1.1)
    ax.plot([x,x-0.23],[y-0.12,y-0.50],lw=1.1)
    ax.plot([x,x+0.23],[y-0.12,y-0.50],lw=1.1)
    ax.text(x,y-0.70,label,ha="center",va="top",fontsize=8)

def usecase_image(filename, title, actor, labels):
    cols = 3 if len(labels)>12 else 2
    rows = math.ceil(len(labels)/cols)
    fig, ax = plt.subplots(figsize=(13, max(7, rows*1.4)))
    ax.axis("off")
    ax.set_xlim(0, 14); ax.set_ylim(0, max(10, rows*1.6+2))
    H=max(10, rows*1.6+2)
    draw_actor(ax,1.1,H/2,actor)
    ax.add_patch(Rectangle((2.7,0.45),10.8,H-0.9,fill=False,lw=1.2))
    ax.text(8.1,H-0.8,title,ha="center",fontsize=12,fontweight="bold")
    ytop=H-1.8
    for i,label in enumerate(labels):
        c=i%cols; r=i//cols
        x=4.4+c*3.15; y=ytop-r*1.25
        ax.add_patch(Ellipse((x,y),2.55,0.75,fill=False,lw=0.9))
        ax.text(x,y,"\n".join(textwrap.wrap(label,22)),ha="center",va="center",fontsize=7)
        ax.plot([1.4,x-1.3],[H/2,y],lw=0.45)
    path=IMG/filename
    savefig(path)
    return path

def overall_usecase_image():
    fig, ax = plt.subplots(figsize=(14,10))
    ax.axis("off"); ax.set_xlim(0,15); ax.set_ylim(0,11)
    ax.add_patch(Rectangle((3.0,0.5),11.2,10,fill=False,lw=1.2))
    ax.text(8.6,10.1,"MeritTrack – Use Case tổng quát",ha="center",fontsize=13,fontweight="bold")
    actor_pos={"Sinh viên":(1.1,8.4),"Cán bộ lớp":(1.1,6.2),"Cán bộ khoa":(1.1,4.0),"Quản trị viên":(1.1,1.8)}
    for a,(x,y) in actor_pos.items(): draw_actor(ax,x,y,a)
    labels=[
      ("Xác thực & tài khoản",5.0,8.8),("Tham gia hoạt động",8.0,8.8),("Điểm rèn luyện",11.0,8.8),
      ("Hồ sơ xét sinh viên",5.0,7.1),("Duyệt vòng 1",8.0,7.1),("Duyệt vòng 2",11.0,7.1),
      ("Nghiệp vụ cán bộ",5.0,5.4),("Quản lý học kỳ",8.0,5.4),("Người dùng & lớp",11.0,5.4),
      ("Hoạt động & điểm danh",5.0,3.7),("Khung điểm ĐRL",8.0,3.7),("Bộ tiêu chuẩn",11.0,3.7),
      ("Đợt xét",5.0,2.0),("Duyệt hồ sơ cán bộ",8.0,2.0),("Báo cáo & nhật ký",11.0,2.0)
    ]
    ucpos={}
    for label,x,y in labels:
        ucpos[label]=(x,y)
        ax.add_patch(Ellipse((x,y),2.45,0.72,fill=False,lw=0.9))
        ax.text(x,y,"\n".join(textwrap.wrap(label,20)),ha="center",va="center",fontsize=7)
    links={
      "Sinh viên":["Xác thực & tài khoản","Tham gia hoạt động","Điểm rèn luyện","Hồ sơ xét sinh viên"],
      "Cán bộ lớp":["Xác thực & tài khoản","Duyệt vòng 1","Nghiệp vụ cán bộ"],
      "Cán bộ khoa":["Xác thực & tài khoản","Duyệt vòng 2","Nghiệp vụ cán bộ","Hoạt động & điểm danh"],
      "Quản trị viên":["Quản lý học kỳ","Người dùng & lớp","Hoạt động & điểm danh","Khung điểm ĐRL","Bộ tiêu chuẩn","Đợt xét","Duyệt hồ sơ cán bộ","Báo cáo & nhật ký"]
    }
    for a,ucs in links.items():
        x1,y1=actor_pos[a]
        for u in ucs:
            x2,y2=ucpos[u]
            ax.plot([x1+0.3,x2-1.25],[y1,y2],lw=0.45)
    path=IMG/"uc_overall.png"; savefig(path); return path

def swimlane(filename, title, lanes, steps):
    # steps: (lane_index, label, kind, target_index_optional)
    n=len(steps); W=12; H=max(7, n*0.75+2)
    fig,ax=plt.subplots(figsize=(12,H*0.65))
    ax.axis("off"); ax.set_xlim(0,W); ax.set_ylim(0,H)
    lane_w=W/len(lanes)
    for i,l in enumerate(lanes):
        x=i*lane_w
        ax.add_patch(Rectangle((x,0.3),lane_w,H-0.8,fill=False,lw=0.9))
        ax.text(x+lane_w/2,H-0.65,l,ha="center",fontsize=9,fontweight="bold")
    ypos=[]
    for i,s in enumerate(steps):
        y=H-1.4-i*((H-2.1)/max(1,n-1))
        ypos.append(y)
        lane,label,kind=s[:3]
        x=lane*lane_w+lane_w/2
        if kind=="decision":
            ax.add_patch(Polygon([[x,y+0.30],[x+0.75,y],[x,y-0.30],[x-0.75,y]],closed=True,fill=False,lw=0.9))
        elif kind=="start" or kind=="end":
            ax.add_patch(Ellipse((x,y),1.5,0.45,fill=False,lw=0.9))
        else:
            ax.add_patch(Rectangle((x-0.9,y-0.28),1.8,0.56,fill=False,lw=0.9))
        ax.text(x,y,"\n".join(textwrap.wrap(label,28)),ha="center",va="center",fontsize=7)
        if i>0:
            pl=steps[i-1][0]
            px=pl*lane_w+lane_w/2
            py=ypos[i-1]
            ax.add_patch(FancyArrowPatch((px,py-0.3),(x,y+0.3),arrowstyle="->",mutation_scale=9,lw=0.7))
    ax.text(W/2,H-0.15,title,ha="center",fontsize=12,fontweight="bold")
    path=IMG/filename; savefig(path); return path

OVERALL=overall_usecase_image()
student_labels=[f'{u["id"]} {u["name"]}' for u in USECASES if "Sinh viên" in uc_role(u) and int(u["id"][2:])<=20]
class_labels=[f'{u["id"]} {u["name"]}' for u in USECASES if "Cán bộ lớp" in uc_role(u) and (int(u["id"][2:])<=8 or 21<=int(u["id"][2:])<=23 or 29<=int(u["id"][2:])<=35)]
faculty_labels=[f'{u["id"]} {u["name"]}' for u in USECASES if "Cán bộ khoa" in uc_role(u) and (int(u["id"][2:])<=8 or 24<=int(u["id"][2:])<=35)]
admin_labels=[f'{u["id"]} {u["name"]}' for u in USECASES if "Quản trị viên" in uc_role(u) and (int(u["id"][2:])<=8 or int(u["id"][2:])>=36)]
UC_STUDENT=usecase_image("uc_student.png","Phân hệ Sinh viên","Sinh viên",student_labels)
UC_CLASS=usecase_image("uc_class_officer.png","Phân hệ Cán bộ lớp","Cán bộ lớp",class_labels)
UC_FACULTY=usecase_image("uc_faculty_officer.png","Phân hệ Cán bộ khoa","Cán bộ khoa",faculty_labels)
UC_ADMIN=usecase_image("uc_admin.png","Phân hệ Quản trị viên","Quản trị viên",admin_labels)

BUSINESS_DIAGRAMS = [
    ("BP01", swimlane("bp01_auth.png","BP01 – Đăng nhập và chuyển ngữ cảnh",
        ["Người dùng","MeritTrack"],
        [(0,"Bắt đầu","start"),(0,"Nhập MSSV/email và mật khẩu","task"),(1,"Kiểm tra tài khoản và mật khẩu","decision"),
         (1,"Tạo session, đặt context mặc định","task"),(0,"Chọn chuyển context (nếu cần)","task"),(1,"Kiểm tra role-context","decision"),
         (1,"Cập nhật session và dashboard","task"),(0,"Kết thúc","end")])),
    ("BP02", swimlane("bp02_activity.png","BP02 – Đăng ký và điểm danh hoạt động",
        ["Người tham gia","MeritTrack","Cán bộ khoa/Admin"],
        [(0,"Xem hoạt động","start"),(1,"Hiển thị activity phù hợp","task"),(0,"Chọn Đăng ký","task"),(1,"Kiểm tra điều kiện đăng ký","decision"),
         (1,"Ghi registration=registered","task"),(0,"Tham gia hoạt động","task"),(2,"Quét QR / nhập MSSV","task"),
         (1,"Kiểm tra thời gian & registration","decision"),(1,"Cập nhật attended + log + ĐRL","task"),(0,"Nhận thông báo","end")])),
    ("BP03", swimlane("bp03_student_submission.png","BP03 – Xét hồ sơ sinh viên hai vòng",
        ["Sinh viên","MeritTrack","Cán bộ lớp","Cán bộ khoa"],
        [(0,"Tạo/tiếp tục hồ sơ","start"),(1,"Auto-evaluate","task"),(0,"Bổ sung minh chứng","task"),(0,"Nộp hồ sơ","task"),
         (1,"Kiểm tra requirements → submitted_v1","decision"),(2,"Đánh giá tiêu chí và duyệt vòng 1","task"),(1,"submitted_v2 / revise / failed","decision"),
         (3,"Đánh giá tiêu chí và duyệt vòng 2","task"),(1,"passed / revise / failed","decision"),(0,"Theo dõi kết quả","end")])),
    ("BP04", swimlane("bp04_officer_submission.png","BP04 – Xét hồ sơ cán bộ",
        ["Cán bộ","MeritTrack","Admin"],
        [(0,"Tạo hồ sơ officer","start"),(1,"Auto-evaluate và tính điểm","task"),(0,"Bổ sung minh chứng","task"),(0,"Nộp hồ sơ","task"),
         (1,"Kiểm tra requirements → submitted_v1","decision"),(2,"Đánh giá hồ sơ","task"),(1,"passed / failed / needs_revision_v1","decision"),(0,"Theo dõi kết quả","end")])),
    ("BP05", swimlane("bp05_criteria_event.png","BP05 – Cấu hình bộ tiêu chuẩn và đợt xét",
        ["Admin","MeritTrack"],
        [(0,"Tạo/clone bộ tiêu chuẩn","start"),(1,"Kiểm tra template mutable","decision"),(0,"Cấu hình nhóm/tiêu chí/rule","task"),
         (1,"Lưu template","task"),(0,"Tạo đợt xét","task"),(1,"Kiểm tra type/template/term","decision"),
         (0,"Đồng bộ snapshot","task"),(1,"Copy event_criteria groups/items","task"),(0,"Công bố đợt xét","end")])),
    ("BP06", swimlane("bp06_import_report.png","BP06 – Import kết quả hoạt động và đồng bộ hồ sơ",
        ["Admin","MeritTrack","Hồ sơ liên quan"],
        [(0,"Chọn activity + file + mode + reason","start"),(1,"Parse và đối chiếu MSSV/lớp/scope","decision"),
         (0,"Xác nhận các trường hợp đặc biệt","task"),(1,"Ghi import batch/rows + attended + ĐRL","task"),
         (2,"Re-evaluate auto criteria và score","task"),(1,"Ghi audit và cập nhật báo cáo","task"),(0,"Kết thúc","end")]))
]

# ------------------------------------------------------------
# XMI 2.1 for Visual Paradigm
# ------------------------------------------------------------
def xml_escape(s):
    return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")
def sid(s):
    s=re.sub(r"[^A-Za-z0-9_]+","_",s)
    return "_"+s
def make_xmi(path, model_name, actors, usecases, assocs):
    parts=['<?xml version="1.0" encoding="UTF-8"?>',
           '<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://www.eclipse.org/uml2/3.0.0/UML">',
           f'  <uml:Model xmi:id="{sid(model_name)}" name="{xml_escape(model_name)}">']
    for a in actors:
        parts.append(f'    <packagedElement xmi:type="uml:Actor" xmi:id="{sid("actor_"+a)}" name="{xml_escape(a)}"/>')
    for u in usecases:
        parts.append(f'    <packagedElement xmi:type="uml:UseCase" xmi:id="{sid("uc_"+u)}" name="{xml_escape(u)}"/>')
    for i,(a,u) in enumerate(assocs,1):
        aid=sid(f"assoc_{i}_{a}_{u}"); e1=sid(f"aend_{i}"); e2=sid(f"uend_{i}")
        parts.append(f'    <packagedElement xmi:type="uml:Association" xmi:id="{aid}" memberEnd="{e1} {e2}">')
        parts.append(f'      <ownedEnd xmi:type="uml:Property" xmi:id="{e1}" type="{sid("actor_"+a)}" association="{aid}"/>')
        parts.append(f'      <ownedEnd xmi:type="uml:Property" xmi:id="{e2}" type="{sid("uc_"+u)}" association="{aid}"/>')
        parts.append('    </packagedElement>')
    parts.extend(['  </uml:Model>','</xmi:XMI>'])
    path.write_text("\n".join(parts), encoding="utf-8")

overall_actors=["Sinh viên","Cán bộ lớp","Cán bộ khoa","Quản trị viên"]
overall_ucs=["Xác thực & tài khoản","Tham gia hoạt động","Điểm rèn luyện","Hồ sơ xét sinh viên","Duyệt vòng 1","Duyệt vòng 2","Nghiệp vụ cán bộ","Quản lý học kỳ","Người dùng & lớp","Hoạt động & điểm danh","Khung điểm ĐRL","Bộ tiêu chuẩn","Đợt xét","Duyệt hồ sơ cán bộ","Báo cáo & nhật ký"]
overall_assoc=[]
omap={
"Sinh viên":["Xác thực & tài khoản","Tham gia hoạt động","Điểm rèn luyện","Hồ sơ xét sinh viên"],
"Cán bộ lớp":["Xác thực & tài khoản","Duyệt vòng 1","Nghiệp vụ cán bộ"],
"Cán bộ khoa":["Xác thực & tài khoản","Duyệt vòng 2","Nghiệp vụ cán bộ","Hoạt động & điểm danh"],
"Quản trị viên":["Quản lý học kỳ","Người dùng & lớp","Hoạt động & điểm danh","Khung điểm ĐRL","Bộ tiêu chuẩn","Đợt xét","Duyệt hồ sơ cán bộ","Báo cáo & nhật ký"]
}
for a,us in omap.items():
    overall_assoc += [(a,u) for u in us]
make_xmi(XMI/"01_MeritTrack_UseCase_TongQuan.xmi","MeritTrack - Use Case tổng quát",overall_actors,overall_ucs,overall_assoc)

def role_xmi(filename, actor, selected):
    names=[f'{u["id"]} - {u["name"]}' for u in selected]
    make_xmi(XMI/filename, f"MeritTrack - {actor}", [actor], names, [(actor,n) for n in names])

role_xmi("02_MeritTrack_UseCase_SinhVien.xmi","Sinh viên",[u for u in USECASES if "Sinh viên" in uc_role(u) and int(u["id"][2:])<=20])
role_xmi("03_MeritTrack_UseCase_CanBoLop.xmi","Cán bộ lớp",[u for u in USECASES if "Cán bộ lớp" in uc_role(u) and (int(u["id"][2:])<=8 or 21<=int(u["id"][2:])<=23 or 29<=int(u["id"][2:])<=35)])
role_xmi("04_MeritTrack_UseCase_CanBoKhoa.xmi","Cán bộ khoa",[u for u in USECASES if "Cán bộ khoa" in uc_role(u) and (int(u["id"][2:])<=8 or 24<=int(u["id"][2:])<=35)])
role_xmi("05_MeritTrack_UseCase_Admin.xmi","Quản trị viên",[u for u in USECASES if "Quản trị viên" in uc_role(u) and (int(u["id"][2:])<=8 or int(u["id"][2:])>=36)])

guide = """BỘ XMI 2.1 CHO VISUAL PARADIGM
================================
Các file .xmi là UML XMI 2.1, chứa Actor, Use Case và Association để nhập vào Visual Paradigm.

Cách nhập:
1. Mở Visual Paradigm Desktop.
2. Project > Import > XMI...
3. Chọn file .xmi tương ứng.
4. Nếu có tùy chọn Auto Layout after imported thì bật.
5. Nếu model element đã được nhập nhưng chưa có canvas: Diagram > New > Use Case Diagram,
   kéo Actor/Use Case từ Model Explorer vào sơ đồ và chọn Auto Layout.

Các file:
01_MeritTrack_UseCase_TongQuan.xmi
02_MeritTrack_UseCase_SinhVien.xmi
03_MeritTrack_UseCase_CanBoLop.xmi
04_MeritTrack_UseCase_CanBoKhoa.xmi
05_MeritTrack_UseCase_Admin.xmi
"""
(XMI/"HUONG_DAN_IMPORT_VISUAL_PARADIGM.txt").write_text(guide,encoding="utf-8")
with zipfile.ZipFile(ROOT/"MeritTrack_VisualParadigm_XMI.zip","w",zipfile.ZIP_DEFLATED) as z:
    for p in sorted(XMI.iterdir()):
        z.write(p, arcname=p.name)

# ------------------------------------------------------------
# Word helpers
# ------------------------------------------------------------
doc=Document()
sec=doc.sections[0]
sec.top_margin=Cm(2.0); sec.bottom_margin=Cm(2.0); sec.left_margin=Cm(3.0); sec.right_margin=Cm(2.0)
styles=doc.styles
styles["Normal"].font.name="Times New Roman"; styles["Normal"].font.size=Pt(13)
styles["Normal"].paragraph_format.line_spacing=1.3
for name,size in [("Title",18),("Heading 1",16),("Heading 2",14),("Heading 3",13)]:
    st=styles[name]; st.font.name="Times New Roman"; st.font.size=Pt(size); st.font.bold=True

def set_cell(cell,text,bold=False,size=10.5,align=None):
    cell.text=""
    p=cell.paragraphs[0]
    if align is not None: p.alignment=align
    r=p.add_run(str(text)); r.font.name="Times New Roman"; r.font.size=Pt(size); r.bold=bold
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER

def shade(cell,fill="D9D9D9"):
    tcPr=cell._tc.get_or_add_tcPr()
    shd=OxmlElement("w:shd"); shd.set(qn("w:fill"),fill); tcPr.append(shd)

def set_repeat_table_header(row):
    trPr=row._tr.get_or_add_trPr()
    tblHeader=OxmlElement('w:tblHeader'); tblHeader.set(qn('w:val'),"true"); trPr.append(tblHeader)

def add_caption(text):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    r=p.add_run(text); r.font.name="Times New Roman"; r.font.size=Pt(11); r.italic=True

def add_picture(path,width=15.5):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path),width=Cm(width))

def add_text(text,bold=False):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
    r=p.add_run(text); r.bold=bold; r.font.name="Times New Roman"; r.font.size=Pt(13)
    return p

def add_meta_row(table,label,value):
    c=table.add_row().cells
    m=c[0].merge(c[1])
    p=m.paragraphs[0]
    r=p.add_run(label); r.bold=True; r.font.name="Times New Roman"; r.font.size=Pt(10.5)
    r=p.add_run(value); r.font.name="Times New Roman"; r.font.size=Pt(10.5)

def add_flow_rows(table, steps):
    for num,side,action in steps:
        c=table.add_row().cells
        if side=="Actor":
            set_cell(c[0],f"{num}. {action}",False,10)
            set_cell(c[1],"",False,10)
        else:
            set_cell(c[0],"",False,10)
            set_cell(c[1],f"{num}. {action}",False,10)

def add_branch_section(table,title,rows):
    c=table.add_row().cells; m=c[0].merge(c[1])
    set_cell(m,title,True,10.5); shade(m,"D9D9D9")
    if not rows:
        c=table.add_row().cells; m=c[0].merge(c[1]); set_cell(m,"Không có.",False,10)
        return
    add_flow_rows(table, rows)

def add_uc_table(u):
    doc.add_heading(f'{u["id"]}. Use Case {u["name"]}',level=3)
    t=doc.add_table(rows=0,cols=2); t.style="Table Grid"; t.alignment=WD_TABLE_ALIGNMENT.CENTER
    add_meta_row(t,"- Tên use case: ",f'{u["id"]} – {u["name"]}')
    add_meta_row(t,"- Mô tả sơ lược: ",u["desc"])
    add_meta_row(t,"- Actor chính: ",u["actor"])
    add_meta_row(t,"- Actor phụ: ",u["secondary"])
    add_meta_row(t,"- Tiền điều kiện: ",u["pre"])
    add_meta_row(t,"- Hậu điều kiện: ",u["post"])
    c=t.add_row().cells; m=c[0].merge(c[1]); set_cell(m,"- Luồng sự kiện chính (Main Flow)",True,10.5); shade(m,"D9D9D9")
    c=t.add_row().cells
    set_cell(c[0],"Actor",True,10.5,WD_ALIGN_PARAGRAPH.CENTER); set_cell(c[1],"Hệ thống",True,10.5,WD_ALIGN_PARAGRAPH.CENTER)
    shade(c[0],"E7E6E6"); shade(c[1],"E7E6E6")
    main=flatten_main(u)
    add_flow_rows(t,main)
    add_branch_section(t,"- Luồng sự kiện thay thế (Alternative Flow)",branch_actions(u["alt"],main,"alternative"))
    add_branch_section(t,"- Luồng sự kiện ngoại lệ (Exception Flow)",branch_actions(u["exc"],main,"exception"))
    doc.add_paragraph()

# Footer page number
footer=sec.footer
p=footer.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=p.add_run(); f1=OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"),"begin")
it=OxmlElement("w:instrText"); it.set(qn("xml:space"),"preserve"); it.text="PAGE"
f2=OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"),"end")
r._r.extend([f1,it,f2])

# ------------------------------------------------------------
# Chapter content - exact 8 sections requested
# ------------------------------------------------------------
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=p.add_run("CHƯƠNG 3\nPHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG")
r.bold=True; r.font.name="Times New Roman"; r.font.size=Pt(18)
add_text("Chương này mô tả các tác nhân, yêu cầu, quy tắc và quy trình nghiệp vụ của MeritTrack; đồng thời trình bày Use Case và đặc tả Use Case bám theo mã nguồn hiện tại.")

# 1
doc.add_heading("3.1. Xác định Actor của hệ thống",level=1)
add_text("MeritTrack có bốn actor nghiệp vụ chính. Role tài khoản và login context được tách biệt, vì vậy cán bộ lớp/cán bộ khoa có thể sử dụng ngữ cảnh người dùng và ngữ cảnh cán bộ trên cùng một tài khoản.")
t=doc.add_table(rows=1,cols=3); t.style="Table Grid"; t.alignment=WD_TABLE_ALIGNMENT.CENTER
for i,h in enumerate(["STT","Actor","Mô tả"]):
    set_cell(t.rows[0].cells[i],h,True,10.5,WD_ALIGN_PARAGRAPH.CENTER); shade(t.rows[0].cells[i],"E7E6E6")
set_repeat_table_header(t.rows[0])
for i,(a,d) in enumerate(ACTORS,1):
    c=t.add_row().cells; set_cell(c[0],i,False,10,WD_ALIGN_PARAGRAPH.CENTER); set_cell(c[1],a,True,10); set_cell(c[2],d,False,10)

# 2
doc.add_heading("3.2. Sơ đồ Use Case",level=1)
add_text("Sơ đồ tổng quát được tách thêm theo từng actor để tránh mật độ liên kết quá lớn. Bộ XMI 2.1 đính kèm có thể nhập vào Visual Paradigm và tiếp tục chỉnh sửa.")
for img,cap in [(OVERALL,"Hình 3.1. Sơ đồ Use Case tổng quát"),
                (UC_STUDENT,"Hình 3.2. Sơ đồ Use Case – Sinh viên"),
                (UC_CLASS,"Hình 3.3. Sơ đồ Use Case – Cán bộ lớp"),
                (UC_FACULTY,"Hình 3.4. Sơ đồ Use Case – Cán bộ khoa"),
                (UC_ADMIN,"Hình 3.5. Sơ đồ Use Case – Quản trị viên")]:
    add_picture(img,15.5); add_caption(cap)

# 3
doc.add_heading("3.3. Yêu cầu chức năng",level=1)
add_text("Yêu cầu chức năng được liệt kê theo role nhằm làm rõ phạm vi sử dụng và trách nhiệm nghiệp vụ của từng actor.")
for role in ["Sinh viên","Cán bộ lớp","Cán bộ khoa","Quản trị viên"]:
    doc.add_heading(f"3.3.{['Sinh viên','Cán bộ lớp','Cán bộ khoa','Quản trị viên'].index(role)+1}. {role}",level=2)
    rows=[u for u in USECASES if role in uc_role(u)]
    # Avoid listing admin common profile/QR use cases not intended for admin.
    if role=="Quản trị viên":
        rows=[u for u in rows if u["id"] in ["UC01","UC02","UC04","UC07","UC08"] or int(u["id"][2:])>=36]
    if role=="Sinh viên":
        rows=[u for u in rows if int(u["id"][2:])<=20]
    if role=="Cán bộ lớp":
        rows=[u for u in rows if int(u["id"][2:])<=8 or 21<=int(u["id"][2:])<=23 or 29<=int(u["id"][2:])<=35]
    if role=="Cán bộ khoa":
        rows=[u for u in rows if int(u["id"][2:])<=8 or 24<=int(u["id"][2:])<=35]
    tb=doc.add_table(rows=1,cols=4); tb.style="Table Grid"; tb.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,h in enumerate(["STT","Mã","Chức năng","Mô tả"]):
        set_cell(tb.rows[0].cells[i],h,True,10,WD_ALIGN_PARAGRAPH.CENTER); shade(tb.rows[0].cells[i],"E7E6E6")
    set_repeat_table_header(tb.rows[0])
    for j,u in enumerate(rows,1):
        c=tb.add_row().cells
        set_cell(c[0],j,False,9.5,WD_ALIGN_PARAGRAPH.CENTER); set_cell(c[1],u["id"],False,9.5,WD_ALIGN_PARAGRAPH.CENTER)
        set_cell(c[2],u["name"],False,9.5); set_cell(c[3],u["desc"],False,9.5)

# 4
doc.add_heading("3.4. Yêu cầu phi chức năng",level=1)
nfr=[
("NFR01","Bảo mật và phân quyền","Kiểm tra quyền ở server; không tin cậy role/context từ client."),
("NFR02","Toàn vẹn dữ liệu","Dùng transaction cho các thao tác cập nhật nhiều bảng quan trọng; duy trì trạng thái nhất quán."),
("NFR03","Bảo toàn lịch sử","Dữ liệu học kỳ cũ, event snapshot, review và timeline phải phục vụ truy vết lịch sử."),
("NFR04","Khả năng truy vết","Ghi audit log cho các thay đổi quản trị nhạy cảm và attendance log cho điểm danh."),
("NFR05","Hiệu năng","Trang danh sách/báo cáo cần lọc theo học kỳ, trạng thái và từ khóa; truy vấn chỉ lấy dữ liệu thuộc phạm vi cần thiết."),
("NFR06","Khả dụng","Giao diện theo role/context nhất quán; thông báo lỗi/thành công rõ ràng; hỗ trợ xem dữ liệu lịch sử."),
("NFR07","An toàn tệp","Minh chứng phải kiểm tra MIME, đuôi tệp, dung lượng và quyền sở hữu submission."),
("NFR08","Khả năng bảo trì","Tách App Router, component, server action, domain service và persistence để giảm coupling."),
]
tb=doc.add_table(rows=1,cols=3); tb.style="Table Grid"; tb.alignment=WD_TABLE_ALIGNMENT.CENTER
for i,h in enumerate(["Mã","Nhóm yêu cầu","Nội dung"]):
    set_cell(tb.rows[0].cells[i],h,True,10.5,WD_ALIGN_PARAGRAPH.CENTER); shade(tb.rows[0].cells[i],"E7E6E6")
for row in nfr:
    c=tb.add_row().cells
    for i,v in enumerate(row): set_cell(c[i],v,False,10)

# 5
doc.add_heading("3.5. Quy tắc nghiệp vụ",level=1)
tb=doc.add_table(rows=1,cols=2); tb.style="Table Grid"; tb.alignment=WD_TABLE_ALIGNMENT.CENTER
set_cell(tb.rows[0].cells[0],"Mã",True,10.5,WD_ALIGN_PARAGRAPH.CENTER); set_cell(tb.rows[0].cells[1],"Quy tắc nghiệp vụ",True,10.5,WD_ALIGN_PARAGRAPH.CENTER)
shade(tb.rows[0].cells[0],"E7E6E6"); shade(tb.rows[0].cells[1],"E7E6E6")
for code,rule in BUSINESS_RULES:
    c=tb.add_row().cells; set_cell(c[0],code,True,10); set_cell(c[1],rule,False,10)

# 6
doc.add_heading("3.6. Quy trình nghiệp vụ",level=1)
processes=[
("BP01","Đăng nhập và chuyển ngữ cảnh","Người dùng, MeritTrack","Xác thực tài khoản, tạo session và chuyển context theo role.","Session hợp lệ và dashboard đúng context."),
("BP02","Đăng ký và điểm danh hoạt động","Sinh viên/Cán bộ, Cán bộ khoa/Admin, MeritTrack","Đăng ký activity, tham gia, quét QR/MSSV, xác nhận attended và ghi điểm ĐRL.","Attendance và nguồn điểm được ghi nhận."),
("BP03","Xét hồ sơ sinh viên","Sinh viên, Cán bộ lớp, Cán bộ khoa, MeritTrack","Tạo hồ sơ, auto-evaluate, nộp, duyệt vòng 1, duyệt vòng 2.","Submission kết thúc passed/failed hoặc quay lại trạng thái cần chỉnh sửa."),
("BP04","Xét hồ sơ cán bộ","Cán bộ lớp/Cán bộ khoa, Admin, MeritTrack","Tạo hồ sơ, auto-evaluate, tính điểm, nộp và Admin duyệt một vòng.","Officer submission passed/failed/revise."),
("BP05","Cấu hình bộ tiêu chuẩn và đợt xét","Admin, MeritTrack","Tạo/clone template, cấu hình nhóm/tiêu chí/rules, tạo event và snapshot.","Event có bộ snapshot tiêu chuẩn cố định."),
("BP06","Import kết quả hoạt động và đồng bộ hồ sơ","Admin, MeritTrack","Import attendance, cập nhật ĐRL, audit và re-evaluate hồ sơ liên quan.","Attendance/score/auto results đồng bộ."),
]
tb=doc.add_table(rows=1,cols=5); tb.style="Table Grid"; tb.alignment=WD_TABLE_ALIGNMENT.CENTER
for i,h in enumerate(["Mã","Quy trình","Thành phần tham gia","Tóm tắt","Kết quả"]):
    set_cell(tb.rows[0].cells[i],h,True,9.5,WD_ALIGN_PARAGRAPH.CENTER); shade(tb.rows[0].cells[i],"E7E6E6")
for row in processes:
    c=tb.add_row().cells
    for i,v in enumerate(row): set_cell(c[i],v,False,9)

# 7
doc.add_heading("3.7. Sơ đồ nghiệp vụ",level=1)
for idx,(code,img) in enumerate(BUSINESS_DIAGRAMS,1):
    add_picture(img,15.5)
    title=next(x[1] for x in processes if x[0]==code)
    add_caption(f"Hình 3.{5+idx}. Sơ đồ nghiệp vụ {code} – {title}")

# 8
doc.add_heading("3.8. Đặc tả Use Case",level=1)
add_text("Biểu mẫu đặc tả tuân theo cấu trúc Actor/Hệ thống. Cột Actor chỉ chứa thao tác do người dùng thực hiện; cột Hệ thống chỉ chứa phản ứng/xử lý của MeritTrack. Chỉ số bước chạy liên tục trong Main Flow. Alternative/Exception Flow dùng chỉ số dạng n.x để chỉ rõ nhánh phát sinh từ bước n của luồng chính và ghi rõ điểm quay lại hoặc kết thúc.")
for u in USECASES:
    add_uc_table(u)

# Appendix: source alignment notes
doc.add_heading("3.9. Ghi chú đồng bộ giữa thiết kế và mã nguồn hiện tại",level=1)
notes=[
("needs_revision_v2","Logic review vòng 2 và submission status helper có sử dụng needs_revision_v2, nhưng CHECK constraint submissions.status trong schema.sql hiện chưa khai báo trạng thái này. Cần đồng bộ schema trước bản cuối."),
("Group score_max","sqlite.ts bổ sung score_max cho criteria_template_groups/event_criteria_groups ở runtime; cloneCriteriaTemplateToEvent hiện chưa copy score_max của group và evaluateSubmission hiện cap ở item nhưng chưa cap tổng theo group."),
("Ranking cán bộ","Báo cáo hiện sử dụng normalized_score/score_total và họ tên làm sắp xếp; nếu business rule cuối yêu cầu tie-break theo chất lượng/số hoạt động thì cần hoàn thiện trước khi khóa thuật toán trong báo cáo.")
]
tb=doc.add_table(rows=1,cols=2); tb.style="Table Grid"
set_cell(tb.rows[0].cells[0],"Hạng mục",True,10.5,WD_ALIGN_PARAGRAPH.CENTER); set_cell(tb.rows[0].cells[1],"Ghi chú",True,10.5,WD_ALIGN_PARAGRAPH.CENTER)
shade(tb.rows[0].cells[0],"E7E6E6"); shade(tb.rows[0].cells[1],"E7E6E6")
for a,b in notes:
    c=tb.add_row().cells; set_cell(c[0],a,True,10); set_cell(c[1],b,False,10)

out=ROOT/"Chuong_3_Phan_tich_Thiet_ke_MeritTrack_HoanChinh.docx"
doc.save(out)
print(out)
