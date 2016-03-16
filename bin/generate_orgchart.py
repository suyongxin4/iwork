import xml.etree.cElementTree as xee
import json


def parse_org_chart(org_chart_file):
    tree = xee.parse(org_chart_file)
    pages = tree.findall("./page")
    employee_pages = []
    titles = ["ceo", "svp", "vp", "avp", "director", "manager", "consultant",
              "engineer", "technologist", "architect", "lead", "practitioner",
              "specialist", "strategist", "alliances", "account", "sales",
              "unknown", "se", "head", "ceo", "executive", "chief", "chair",
              "president", "marketing"]

    for page in pages:
        page_number = page.get("number")
        if int(page_number) < 10 or int(page_number) >= 187:
            continue

        employees = page.findall("./text")
        num_employee = len(employees)
        employee_pages.append([])
        for i in xrange(0, num_employee, 2):
            if num_employee % 2:
                for k in titles:
                    if k in employees[i + 1].text.lower():
                        break
                else:
                    print i, employees[i + 1].text

            employee_pages[-1].append(
                {
                    "name": employees[i].text,
                    "top": int(employees[i].get("top")),
                    "title": employees[i + 1].text,
                })
    return employee_pages


def siblings(employee, sorted_ones, i):
    sibs = [employee]
    for j in xrange(i, len(sorted_ones)):
        if sorted_ones[j]["top"] == employee["top"]:
            sibs.append(sorted_ones[j])
        elif sorted_ones[j]["top"] > employee["top"]:
            break
    return sibs


def children(parent, employees, ignores):
    for i, employee in enumerate(employees):
        if employee["name"] == parent["name"]:
            break

    ignores = [e["name"] for e in ignores]
    kids = []
    for j in xrange(i + 1, len(employees)):
        if (employees[j]["top"] > parent["top"] and
                employees[j]["name"] not in ignores):
            kids.append(employees[j])
        else:
            return kids
    return []


def generate_report(employee_pages):
    for employees in employee_pages:
        sorted_ones = sorted(employees, cmp=lambda x, y: x["top"] - y["top"])
        highest = sorted_ones[0]
        seconds = []
        solars = []

        for i in xrange(1, len(sorted_ones)):
            sibs = siblings(sorted_ones[i], sorted_ones, i + 1)
            if len(sibs) > 1:
                seconds.extend(sibs)
                break
            else:
                solars.extend(sibs)

        for solar in solars:
            print "{}, {}".format(solar["name"], highest["name"])

        for second in seconds:
            print "{}, {}".format(second["name"], highest["name"])

        found_kids = False
        for second in seconds:
            kids = children(second, employees, seconds)
            if kids:
                found_kids = True

            for kid in kids:
                print "{}, {}".format(kid["name"], second["name"])

        if not found_kids:
            ignores = set(s["name"] for s in seconds)
            ignores.update(set(s["name"] for s in solars))
            ignores.add(highest["name"])
            for emp in employees:
                if emp["name"] not in ignores:
                    print "{}, {}".format(emp["name"], highest["name"])


if __name__ == "__main__":
    # 1) run pdftohtml -xml orgchart.pdf org.xml
    # 2) grep -v ">-<" org.xml > org.xml.filtered
    # 3) use vim to replace "<A" to "<a"
    # 4) run generate_orgchart.py

    pages = parse_org_chart("org.xml.filtered")
    generate_report(pages)
