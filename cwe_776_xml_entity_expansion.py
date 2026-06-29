import xml.etree.ElementTree as ET

def parse_xml(xml: str):
    # CWE-776: XML Entity Expansion
    return ET.fromstring(xml)
