import io
import csv
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from sklearn import preprocessing

def main():
    # put output from experiments into list
    output = []

    with open("../output/output.csv", "r") as file:
        for line in file:
            output.append(line.strip())

    all_hba = []
    all_hba_bat = []
    all_tba = []
    all_tba_bat = []

    for row in range(1, len(output)):
        if row % 4 == 0:
            all_hba.append(output[row])
        if row % 4 == 1:
            all_hba_bat.append(output[row])
        if row % 4 == 2:
            all_tba.append(output[row])
        if row % 4 == 3:
            all_tba_bat.append(output[row])

    hba_small = []
    hba_medium = []
    hba_large = []
    hba_bat_small = []
    hba_bat_medium = []
    hba_bat_large = []
    tba_small = []
    tba_medium = []
    tba_large = []
    tba_bat_small = []
    tba_bat_medium = []
    tba_bat_large = []

    for row in range(500):
        hba_small.append(all_hba[row])
        hba_bat_small.append(all_hba_bat[row])
        tba_small.append(all_tba[row])
        tba_bat_small.append(all_tba_bat[row])

    for row in range(500, 1000):
        hba_medium.append(all_hba[row])
        hba_bat_medium.append(all_hba_bat[row])
        tba_medium.append(all_tba[row])
        tba_bat_medium.append(all_tba_bat[row])

    for row in range(1000, 1500):
        hba_large.append(all_hba[row])
        hba_bat_large.append(all_hba_bat[row])
        tba_large.append(all_tba[row])
        tba_bat_large.append(all_tba_bat[row])

    for row in reversed(range(500)):
        hba_small[row] = hba_small[row].split(",")
        hba_bat_small[row] = hba_bat_small[row].split(",")

        if hba_small[row][0] == hba_bat_small[row][0]:
            del hba_small[row]
            del hba_bat_small[row]

        hba_medium[row] = hba_medium[row].split(",")
        hba_bat_medium[row] = hba_bat_medium[row].split(",")

        if hba_medium[row][0] == hba_bat_medium[row][0]:
            del hba_medium[row]
            del hba_bat_medium[row]

        hba_large[row] = hba_large[row].split(",")
        hba_bat_large[row] = hba_bat_large[row].split(",")

        if hba_large[row][0] == hba_bat_large[row][0]:
            del hba_large[row]
            del hba_bat_large[row]

        tba_small[row] = tba_small[row].split(",")
        tba_bat_small[row] = tba_bat_small[row].split(",")

        if tba_small[row][0] == tba_bat_small[row][0]:
            del tba_small[row]
            del tba_bat_small[row]

        tba_medium[row] = tba_medium[row].split(",")
        tba_bat_medium[row] = tba_bat_medium[row].split(",")

        if tba_medium[row][0] == tba_bat_medium[row][0]:
            del tba_medium[row]
            del tba_bat_medium[row]

        tba_large[row] = tba_large[row].split(",")
        tba_bat_large[row] = tba_bat_large[row].split(",")

        if tba_large[row][0] == tba_bat_large[row][0]:
            del tba_large[row]
            del tba_bat_large[row]

    X_hba10 = []
    Y_hba10 = []
    X_hba20 = []
    Y_hba20 = []
    X_hba30 = []
    Y_hba30 = []
    X_hba_bat10 = []
    Y_hba_bat10 = []
    X_hba_bat20 = []
    Y_hba_bat20 = []
    X_hba_bat30 = []
    Y_hba_bat30 = []
    X_tba10 = []
    Y_tba10 = []
    X_tba20 = []
    Y_tba20 = []
    X_tba30 = []
    Y_tba30 = []
    X_tba_bat10 = []
    Y_tba_bat10 = []
    X_tba_bat20 = []
    Y_tba_bat20 = []
    X_tba_bat30 = []
    Y_tba_bat30 = []

    for row in hba_small:
        X_hba10.append(row[1])
        Y_hba10.append(row[0])

    for row in hba_medium:
        X_hba20.append(row[1])
        Y_hba20.append(row[0])

    for row in hba_large:
        X_hba30.append(row[1])
        Y_hba30.append(row[0])

    for row in hba_bat_small:
        X_hba_bat10.append(row[1])
        Y_hba_bat10.append(row[0])

    for row in hba_bat_medium:
        X_hba_bat20.append(row[1])
        Y_hba_bat20.append(row[0])

    for row in hba_bat_large:
        X_hba_bat30.append(row[1])
        Y_hba_bat30.append(row[0])

    for row in tba_small:
        X_tba10.append(row[1])
        Y_tba10.append(row[0])

    for row in tba_medium:
        X_tba20.append(row[1])
        Y_tba20.append(row[0])

    for row in tba_large:
        X_tba30.append(row[1])
        Y_tba30.append(row[0])

    for row in tba_bat_small:
        X_tba_bat10.append(row[1])
        Y_tba_bat10.append(row[0])

    for row in tba_bat_medium:
        X_tba_bat20.append(row[1])
        Y_tba_bat20.append(row[0])

    for row in tba_bat_large:
        X_tba_bat30.append(row[1])
        Y_tba_bat30.append(row[0])

    nX_hba10 = np.asarray(X_hba10).astype(np.float)
    nY_hba10 = np.asarray(Y_hba10).astype(np.float)
    nX_hba_bat10 = np.asarray(X_hba_bat10).astype(np.float)
    nY_hba_bat10 = np.asarray(Y_hba_bat10).astype(np.float)
    nX_tba10 = np.asarray(X_tba10).astype(np.float)
    nY_tba10 = np.asarray(Y_tba10).astype(np.float)
    nX_tba_bat10 = np.asarray(X_tba_bat10).astype(np.float)
    nY_tba_bat10 = np.asarray(Y_tba_bat10).astype(np.float)

    nX_hba20 = np.asarray(X_hba20).astype(np.float)
    nY_hba20 = np.asarray(Y_hba20).astype(np.float)
    nX_hba_bat20 = np.asarray(X_hba_bat20).astype(np.float)
    nY_hba_bat20 = np.asarray(Y_hba_bat20).astype(np.float)
    nX_tba20 = np.asarray(X_tba20).astype(np.float)
    nY_tba20 = np.asarray(Y_tba20).astype(np.float)
    nX_tba_bat20 = np.asarray(X_tba_bat20).astype(np.float)
    nY_tba_bat20 = np.asarray(Y_tba_bat20).astype(np.float)

    # X_hba20.sort()
    # Y_hba20.sort()
    # X_hba_bat20.sort()
    # Y_hba_bat20.sort()
    # X_tba20.sort()
    # Y_tba20.sort()
    # X_tba_bat20.sort()
    # Y_tba_bat20.sort()

    # X_hba30.sort()
    # Y_hba30.sort()
    # X_hba_bat30.sort()
    # Y_hba_bat30.sort()
    # X_tba30.sort()
    # Y_tba30.sort()
    # X_tba_bat30.sort()
    # Y_tba_bat30.sort()

    # nX_hba10 = preprocessing.normalize(X_hba10)
    # nY_hba10 = preprocessing.normalize(Y_hba10)
    # nX_hba_bat10 = preprocessing.normalize(X_hba_bat10)
    # nY_hba_bat10 = preprocessing.normalize(Y_hba_bat10)
    # nX_tba10 = preprocessing.normalize(X_tba10)
    # nY_tba10 = preprocessing.normalize(Y_tba10)
    # nX_tba_bat10 = preprocessing.normalize(X_tba_bat10)
    # nY_tba_bat10 = preprocessing.normalize(Y_tba_bat10)

    # nX_hba20 = preprocessing.normalize(X_hba20)
    # nY_hba20 = preprocessing.normalize(Y_hba20)
    # nX_hba_bat20 = preprocessing.normalize(X_hba_bat20)
    # nY_hba_bat20 = preprocessing.normalize(Y_hba_bat20)
    # nX_tba20 = preprocessing.normalize(X_tba20)
    # nY_tba20 = preprocessing.normalize(Y_tba20)
    # nX_tba_bat20 = preprocessing.normalize(X_tba_bat20)
    # nY_tba_bat20 = preprocessing.normalize(Y_tba_bat20)

    # nX_hba30 = preprocessing.normalize(X_hba30)
    # nY_hba30 = preprocessing.normalize(Y_hba30)
    # nX_hba_bat30 = preprocessing.normalize(X_hba_bat30)
    # nY_hba_bat30 = preprocessing.normalize(Y_hba_bat30)
    # nX_tba30 = preprocessing.normalize(X_tba30)
    # nY_tba30 = preprocessing.normalize(Y_tba30)
    # nX_tba_bat30 = preprocessing.normalize(X_tba_bat30)
    # nY_tba_bat30 = preprocessing.normalize(Y_tba_bat30)

    def best_fit(X, Y):
        xbar = sum(X)/len(X)
        ybar = sum(Y)/len(Y)
        n = len(X) # or len(Y)

        numer = sum([xi*yi for xi,yi in zip(X, Y)]) - n * xbar * ybar
        denum = sum([xi**2 for xi in X]) - n * xbar**2

        b = numer / denum
        a = ybar - b * xbar

        print('best fit line:\ny = {:.2f} + {:.2f}x'.format(a, b))

        return a, b

    for xArray, yArray, color in [
        # [nX_hba10, nY_hba10, "black"],
        # [nX_hba_bat10, nY_hba_bat10, "blue"],
        [nX_tba10, nY_tba10, "black"],
        [nX_tba_bat10, nY_tba_bat10, "blue"]
    ]:
        # a, b = best_fit(xArray, yArray)
        plt.scatter(xArray, yArray, color=color)
        # plt.plot(xArray, [a + b * xi for xi in xArray], color=color)

    plt.axis('auto')
    plt.xlabel("Average Battery Life Before")
    plt.xticks([])
    plt.ylabel("Average Battery Life After")
    plt.yticks([])
    plt.title("Field Size: 10")
    plt.show()


if __name__ == "__main__":
    main()
