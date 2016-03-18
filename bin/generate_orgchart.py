import xml.etree.cElementTree as xee
import json
import csv


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


def create_one_chart(emp, manager):
    chart = {
        "name": emp["name"],
        "manager": manager["name"],
        "department": None,
        "location": None,
        "email": None,
    }
    return chart


def generate_report(employee_pages):
    charts = []
    for employees in employee_pages:
        sorted_ones = sorted(employees, cmp=lambda x, y: x["top"] - y["top"])
        highest = sorted_ones[0]
        seconds = []
        solars = []

        # print highest["name"]
        for i in xrange(1, len(sorted_ones)):
            sibs = siblings(sorted_ones[i], sorted_ones, i + 1)
            if len(sibs) > 1:
                seconds.extend(sibs)
                break
            else:
                solars.extend(sibs)

        for solar in solars:
            charts.append(create_one_chart(solar, highest))
            # print solar["name"]

        for second in seconds:
            charts.append(create_one_chart(second, highest))
            # print second["name"]

        found_kids = False
        for second in seconds:
            kids = children(second, employees, seconds)
            if kids:
                found_kids = True

            for kid in kids:
                charts.append(create_one_chart(kid, second))

        if not found_kids:
            ignores = set(s["name"] for s in seconds)
            ignores.update(set(s["name"] for s in solars))
            ignores.add(highest["name"])
            for emp in employees:
                if emp["name"] in ignores:
                    continue

                charts.append(create_one_chart(emp, highest))
    return charts


def load_high_profiles(csv_file):
    profiles = {}
    with open(csv_file) as f:
        reader = csv.reader(f, delimiter=",", quotechar='"')
        for lin in reader:
            profiles[lin[0]] = {
                "name": lin[0],
                "location": lin[1],
                "department": lin[2],
                "email": lin[3],
            }
    return profiles


def find_boss(chart, charts):
    for c in charts:
        if c["name"] == chart["manager"]:
            return c
    return None


def fill_missing_info(charts, profiles):
    for chart in charts:
        name = chart["name"]
        if name in profiles:
            chart["location"] = profiles[name]["location"]
            chart["department"] = profiles[name]["department"]
            chart["email"] = profiles[name]["email"]
        else:
            my_chart = chart
            while 1:
                boss = find_boss(my_chart, charts)
                if not boss:
                    break

                name = boss["name"]
                if name in profiles:
                    chart["location"] = profiles[name]["location"]
                    chart["department"] = profiles[name]["department"]
                    break
                else:
                    my_chart = boss


if __name__ == "__main__":
    # 1) run pdftohtml -xml orgchart.pdf org.xml
    # 2) grep -v ">-<" org.xml > org.xml.filtered
    # 3) use vim to replace "<A" to "<a"
    # 4) run generate_orgchart.py

    pages = parse_org_chart("org.xml.filtered")
    charts = generate_report(pages)
    profiles = load_high_profiles("heads")
    fill_missing_info(charts, profiles)

    # for chart in charts:
    #    print json.dumps(chart)
    json.dump(charts, open("report.json", "w"))
